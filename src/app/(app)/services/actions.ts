"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { services, serviceCategories, auditLogs } from "@/db/schema";
import {
  requireActivePermission,
  requireTenantSession,
  SubscriptionLapsedError,
} from "@/lib/auth";
import { can, PermissionError } from "@/lib/permissions";
import { parseMoney } from "@/lib/money";
import { limitsForTier, isWithinLimit } from "@/config/plans";
import { count } from "drizzle-orm";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Turns thrown auth errors into something the form can render. */
function toResult(error: unknown): ActionResult {
  if (error instanceof PermissionError) {
    return { ok: false, error: "You do not have permission to do that." };
  }
  if (error instanceof SubscriptionLapsedError) {
    return {
      ok: false,
      error: "Your subscription is not active. Choose a plan to continue.",
    };
  }
  console.error("[services-action]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Give the service a name").max(120),
  categoryId: z.string().uuid().nullable(),
  description: z.string().trim().max(500).nullable(),
  price: z.number().int().min(0, "Price cannot be negative"),
  durationMinutes: z.number().int().min(0).max(600),
  maxDiscountPercent: z.number().min(0).max(100),
});

function readServiceForm(formData: FormData, currency: string) {
  const rawCategory = String(formData.get("categoryId") ?? "");
  const rawDescription = String(formData.get("description") ?? "").trim();

  return serviceSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    categoryId: rawCategory && rawCategory !== "none" ? rawCategory : null,
    description: rawDescription || null,
    price: parseMoney(String(formData.get("price") ?? "0"), currency) ?? 0,
    durationMinutes: Number(formData.get("durationMinutes") ?? 30),
    maxDiscountPercent: Number(formData.get("maxDiscountPercent") ?? 100),
  });
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function createService(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { clinic, member, subscription } =
      await requireActivePermission("service:create");

    const parsed = readServiceForm(formData, clinic.currency);
    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    // A plan's service ceiling is enforced here rather than in the UI alone,
    // so a stale page cannot slip past it.
    const limits = limitsForTier(subscription?.tier ?? "trial");
    const [existing] = await db
      .select({ value: count() })
      .from(services)
      .where(
        and(eq(services.clinicId, clinic.id), eq(services.isActive, true)),
      );

    if (!isWithinLimit(existing?.value ?? 0, limits.services)) {
      return {
        ok: false,
        error: `Your plan allows ${limits.services} services. Upgrade to add more.`,
      };
    }

    const [created] = await db
      .insert(services)
      .values({
        clinicId: clinic.id,
        createdBy: member.id,
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        price: parsed.data.price,
        durationMinutes: parsed.data.durationMinutes,
        maxDiscountPercent: String(parsed.data.maxDiscountPercent),
      })
      .returning();

    await db.insert(auditLogs).values({
      clinicId: clinic.id,
      memberId: member.id,
      action: "service.created",
      entityType: "service",
      entityId: created.id,
      metadata: { name: created.name, price: created.price },
    });

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updateService(
  serviceId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { clinic, member } = await requireActivePermission("service:create");

    const [existing] = await db
      .select()
      .from(services)
      .where(
        and(eq(services.id, serviceId), eq(services.clinicId, clinic.id)),
      )
      .limit(1);

    if (!existing) return { ok: false, error: "That service no longer exists." };

    const parsed = readServiceForm(formData, clinic.currency);
    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    // Editing a name is a lesser act than repricing; only the latter needs the
    // price permission, so a manager without it can still fix a typo.
    const priceChanged = parsed.data.price !== existing.price;
    if (priceChanged && !can(member, "service:edit_price")) {
      return {
        ok: false,
        error: "You do not have permission to change prices.",
      };
    }

    await db
      .update(services)
      .set({
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        description: parsed.data.description,
        price: parsed.data.price,
        durationMinutes: parsed.data.durationMinutes,
        maxDiscountPercent: String(parsed.data.maxDiscountPercent),
        updatedAt: new Date(),
      })
      .where(eq(services.id, serviceId));

    if (priceChanged) {
      await db.insert(auditLogs).values({
        clinicId: clinic.id,
        memberId: member.id,
        action: "service.repriced",
        entityType: "service",
        entityId: serviceId,
        metadata: { from: existing.price, to: parsed.data.price },
      });
    }

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function toggleService(
  serviceId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    const { clinic } = await requireActivePermission("service:create");

    await db
      .update(services)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(eq(services.id, serviceId), eq(services.clinicId, clinic.id)),
      );

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

const categorySchema = z.object({
  name: z.string().trim().min(1, "Give the category a name").max(80),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour")
    .default("#0d9488"),
});

export async function createCategory(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { clinic } = await requireActivePermission("service:create");

    const parsed = categorySchema.safeParse({
      name: String(formData.get("name") ?? ""),
      colorHex: String(formData.get("colorHex") ?? "#0d9488"),
    });

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    const [existing] = await db
      .select({ value: count() })
      .from(serviceCategories)
      .where(eq(serviceCategories.clinicId, clinic.id));

    await db.insert(serviceCategories).values({
      clinicId: clinic.id,
      name: parsed.data.name,
      colorHex: parsed.data.colorHex,
      sortOrder: existing?.value ?? 0,
    });

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/** Read-side helper for client components that need the operator's limits. */
export async function getServicePermissions() {
  const { member } = await requireTenantSession();
  return {
    canCreate: can(member, "service:create"),
    canEditPrice: can(member, "service:edit_price"),
    canDelete: can(member, "service:delete"),
  };
}
