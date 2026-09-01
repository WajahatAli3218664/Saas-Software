"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clinics, members, auditLogs } from "@/db/schema";
import {
  requireActivePermission,
  requirePermission,
  SubscriptionLapsedError,
} from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

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
  console.error("[settings-action]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const clinicSchema = z.object({
  name: z.string().trim().min(1, "Your clinic needs a name").max(120),
  phone: z.string().trim().max(32).nullable(),
  email: z.union([z.literal(""), z.string().email("Check the email address")]),
  addressLine: z.string().trim().max(200).nullable(),
  city: z.string().trim().max(80).nullable(),
  taxLabel: z.string().trim().max(40).nullable(),
  taxNumber: z.string().trim().max(60).nullable(),
  taxPercent: z.number().min(0).max(100),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, "Give invoices a prefix")
    .max(10)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only"),
  invoiceFooter: z.string().trim().max(500).nullable(),
});

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  return str === "" ? null : str;
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export async function updateClinic(formData: FormData): Promise<ActionResult> {
  try {
    const { clinic } = await requireActivePermission("clinic:manage");

    const parsed = clinicSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      phone: emptyToNull(formData.get("phone")),
      email: String(formData.get("email") ?? "").trim(),
      addressLine: emptyToNull(formData.get("addressLine")),
      city: emptyToNull(formData.get("city")),
      taxLabel: emptyToNull(formData.get("taxLabel")),
      taxNumber: emptyToNull(formData.get("taxNumber")),
      taxPercent: Number(formData.get("taxPercent") ?? 0),
      invoicePrefix: String(formData.get("invoicePrefix") ?? "INV"),
      invoiceFooter: emptyToNull(formData.get("invoiceFooter")),
    });

    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    await db
      .update(clinics)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        addressLine: parsed.data.addressLine,
        city: parsed.data.city,
        taxLabel: parsed.data.taxLabel,
        taxNumber: parsed.data.taxNumber,
        taxPercent: String(parsed.data.taxPercent),
        invoicePrefix: parsed.data.invoicePrefix.toUpperCase(),
        invoiceFooter: parsed.data.invoiceFooter,
        updatedAt: new Date(),
      })
      .where(eq(clinics.id, clinic.id));

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

const grantsSchema = z.object({
  role: z.enum(["owner", "admin", "manager", "staff"]),
  canCreateServices: z.boolean(),
  canEditPrices: z.boolean(),
  canGiveDiscount: z.boolean(),
  canVoidInvoice: z.boolean(),
  canViewReports: z.boolean(),
  canManageStaff: z.boolean(),
  maxDiscountPercent: z.number().min(0).max(100),
  isActive: z.boolean(),
});

export async function updateMemberGrants(
  memberId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { clinic, member: actor } =
      await requireActivePermission("staff:manage");

    const parsed = grantsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Check the permissions and try again." };
    }

    const [target] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), eq(members.clinicId, clinic.id)))
      .limit(1);

    if (!target) return { ok: false, error: "That person is no longer here." };

    // The owner is the account holder — nobody else may demote or disable
    // them, and they cannot lock themselves out either.
    if (target.role === "owner" && actor.id !== target.id) {
      return { ok: false, error: "The owner's access cannot be changed." };
    }
    if (target.role === "owner" && parsed.data.role !== "owner") {
      return {
        ok: false,
        error: "Transfer ownership before changing this role.",
      };
    }
    if (actor.id === target.id && !parsed.data.isActive) {
      return { ok: false, error: "You cannot deactivate your own account." };
    }

    await db
      .update(members)
      .set({
        role: parsed.data.role,
        canCreateServices: parsed.data.canCreateServices,
        canEditPrices: parsed.data.canEditPrices,
        canGiveDiscount: parsed.data.canGiveDiscount,
        canVoidInvoice: parsed.data.canVoidInvoice,
        canViewReports: parsed.data.canViewReports,
        canManageStaff: parsed.data.canManageStaff,
        maxDiscountPercent: String(parsed.data.maxDiscountPercent),
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(members.id, memberId));

    await db.insert(auditLogs).values({
      clinicId: clinic.id,
      memberId: actor.id,
      action: "member.permissions_changed",
      entityType: "member",
      entityId: memberId,
      metadata: {
        target: target.fullName,
        role: parsed.data.role,
        maxDiscountPercent: parsed.data.maxDiscountPercent,
      },
    });

    revalidatePath("/settings/staff");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/** Read-only, so it stays available on a lapsed subscription. */
export async function getAuditTrail(limit = 50) {
  const { clinic } = await requirePermission("report:view");

  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      memberName: members.fullName,
    })
    .from(auditLogs)
    .leftJoin(members, eq(auditLogs.memberId, members.id))
    .where(eq(auditLogs.clinicId, clinic.id))
    .orderBy(auditLogs.createdAt)
    .limit(limit);
}
