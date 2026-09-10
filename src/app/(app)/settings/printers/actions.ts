"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { printTemplates, auditLogs } from "@/db/schema";
import { requireActivePermission, SubscriptionLapsedError } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { PLANS } from "@/config/plans";

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
  console.error("[printer-action]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export const PAPER_SIZES = [
  {
    value: "a4",
    label: "A4 sheet",
    hint: "A normal office printer.",
  },
  {
    value: "a5",
    label: "A5 sheet",
    hint: "Half a page — less paper per invoice.",
  },
  {
    value: "thermal_80",
    label: "Thermal 80mm",
    hint: "The wider receipt printers, most common at a counter.",
  },
  {
    value: "thermal_58",
    label: "Thermal 58mm",
    hint: "The narrow receipt printers.",
  },
] as const;

const templateSchema = z.object({
  name: z.string().trim().min(1, "Give this printer a name").max(60),
  paperSize: z.enum(["a4", "a5", "thermal_80", "thermal_58"]),
  showLogo: z.boolean(),
  showTax: z.boolean(),
  headerText: z.string().trim().max(200).nullable(),
  footerText: z.string().trim().max(300).nullable(),
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

function parseForm(formData: FormData) {
  return templateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    paperSize: String(formData.get("paperSize") ?? "a4"),
    showLogo: formData.get("showLogo") === "on",
    showTax: formData.get("showTax") === "on",
    headerText: emptyToNull(formData.get("headerText")),
    footerText: emptyToNull(formData.get("footerText")),
  });
}

export async function createPrintTemplate(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { clinic, member, subscription } =
      await requireActivePermission("clinic:manage");

    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    // The plan sells a number of printers, so it has to be enforced here
    // and not only hidden in the UI. A trial gets the mid-tier allowance so
    // the feature can actually be tried before anyone pays for it.
    const tier = subscription?.tier;
    const allowed =
      !tier || tier === "trial"
        ? PLANS.professional.limits.printTemplates
        : PLANS[tier].limits.printTemplates;
    if (allowed !== -1) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(printTemplates)
        .where(eq(printTemplates.clinicId, clinic.id));
      if (count >= allowed) {
        return {
          ok: false,
          error: `Your plan covers ${allowed} ${allowed === 1 ? "printer" : "printers"}. Upgrade to add more.`,
        };
      }
    }

    const [created] = await db
      .insert(printTemplates)
      .values({
        clinicId: clinic.id,
        name: parsed.data.name,
        paperSize: parsed.data.paperSize,
        showLogo: parsed.data.showLogo,
        showTax: parsed.data.showTax,
        headerText: parsed.data.headerText,
        footerText: parsed.data.footerText,
      })
      .returning();

    await db.insert(auditLogs).values({
      clinicId: clinic.id,
      memberId: member.id,
      action: "print_template.create",
      entityType: "print_template",
      entityId: created.id,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function updatePrintTemplate(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { clinic, member } = await requireActivePermission("clinic:manage");

    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    const updated = await db
      .update(printTemplates)
      .set({
        name: parsed.data.name,
        paperSize: parsed.data.paperSize,
        showLogo: parsed.data.showLogo,
        showTax: parsed.data.showTax,
        headerText: parsed.data.headerText,
        footerText: parsed.data.footerText,
      })
      // Scoped by clinic as well as id, so an id from another tenant
      // matches nothing rather than editing their row.
      .where(and(eq(printTemplates.id, id), eq(printTemplates.clinicId, clinic.id)))
      .returning();

    if (updated.length === 0) {
      return { ok: false, error: "That printer no longer exists." };
    }

    await db.insert(auditLogs).values({
      clinicId: clinic.id,
      memberId: member.id,
      action: "print_template.update",
      entityType: "print_template",
      entityId: id,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function setDefaultPrintTemplate(id: string): Promise<ActionResult> {
  try {
    const { clinic, member } = await requireActivePermission("clinic:manage");

    const [target] = await db
      .select()
      .from(printTemplates)
      .where(and(eq(printTemplates.id, id), eq(printTemplates.clinicId, clinic.id)))
      .limit(1);

    if (!target) return { ok: false, error: "That printer no longer exists." };

    // One default per clinic: clear the others, then set this one, in a
    // transaction so no invoice can be printed against zero or two defaults.
    await db.transaction(async (tx) => {
      await tx
        .update(printTemplates)
        .set({ isDefault: false })
        .where(
          and(eq(printTemplates.clinicId, clinic.id), ne(printTemplates.id, id)),
        );
      await tx
        .update(printTemplates)
        .set({ isDefault: true })
        .where(eq(printTemplates.id, id));
    });

    await db.insert(auditLogs).values({
      clinicId: clinic.id,
      memberId: member.id,
      action: "print_template.set_default",
      entityType: "print_template",
      entityId: id,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function deletePrintTemplate(id: string): Promise<ActionResult> {
  try {
    const { clinic, member } = await requireActivePermission("clinic:manage");

    const [target] = await db
      .select()
      .from(printTemplates)
      .where(and(eq(printTemplates.id, id), eq(printTemplates.clinicId, clinic.id)))
      .limit(1);

    if (!target) return { ok: false, error: "That printer no longer exists." };

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(printTemplates)
      .where(eq(printTemplates.clinicId, clinic.id));

    // Printing falls back to this list, so an empty one would leave the
    // clinic unable to print at all.
    if (count <= 1) {
      return { ok: false, error: "You need at least one printer set up." };
    }

    await db.transaction(async (tx) => {
      await tx.delete(printTemplates).where(eq(printTemplates.id, id));
      // Deleting the default would leave the clinic with none, so promote
      // whichever remains first.
      if (target.isDefault) {
        const [next] = await tx
          .select({ id: printTemplates.id })
          .from(printTemplates)
          .where(eq(printTemplates.clinicId, clinic.id))
          .limit(1);
        if (next) {
          await tx
            .update(printTemplates)
            .set({ isDefault: true })
            .where(eq(printTemplates.id, next.id));
        }
      }
    });

    await db.insert(auditLogs).values({
      clinicId: clinic.id,
      memberId: member.id,
      action: "print_template.delete",
      entityType: "print_template",
      entityId: id,
    });

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
