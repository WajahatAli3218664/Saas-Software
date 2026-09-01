"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireActivePermission, SubscriptionLapsedError } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { nextPatientCode } from "@/lib/tenant";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  patientId?: string;
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
  console.error("[patients-action]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const patientSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the patient's name").max(120),
  phone: z.string().trim().max(32).nullable(),
  email: z.union([z.literal(""), z.string().email("Check the email address")]),
  gender: z.enum(["male", "female", "other"]).nullable(),
  dateOfBirth: z.string().nullable(),
  city: z.string().trim().max(80).nullable(),
  addressLine: z.string().trim().max(200).nullable(),
  allergies: z.string().trim().max(500).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  return str === "" || str === "none" ? null : str;
}

function readForm(formData: FormData) {
  return patientSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: emptyToNull(formData.get("phone")),
    email: String(formData.get("email") ?? "").trim(),
    gender: emptyToNull(formData.get("gender")) as
      | "male"
      | "female"
      | "other"
      | null,
    dateOfBirth: emptyToNull(formData.get("dateOfBirth")),
    city: emptyToNull(formData.get("city")),
    addressLine: emptyToNull(formData.get("addressLine")),
    allergies: emptyToNull(formData.get("allergies")),
    notes: emptyToNull(formData.get("notes")),
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

export async function createPatient(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { clinic } = await requireActivePermission("patient:create");

    const parsed = readForm(formData);
    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    const code = await nextPatientCode(clinic.id);
    const [created] = await db
      .insert(patients)
      .values({
        clinicId: clinic.id,
        code,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        gender: parsed.data.gender,
        dateOfBirth: parsed.data.dateOfBirth
          ? new Date(parsed.data.dateOfBirth)
          : null,
        city: parsed.data.city,
        addressLine: parsed.data.addressLine,
        allergies: parsed.data.allergies,
        notes: parsed.data.notes,
      })
      .returning();

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true, patientId: created.id };
  } catch (error) {
    return toResult(error);
  }
}

export async function updatePatient(
  patientId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { clinic } = await requireActivePermission("patient:edit");

    const parsed = readForm(formData);
    if (!parsed.success) {
      return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
    }

    const result = await db
      .update(patients)
      .set({
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        gender: parsed.data.gender,
        dateOfBirth: parsed.data.dateOfBirth
          ? new Date(parsed.data.dateOfBirth)
          : null,
        city: parsed.data.city,
        addressLine: parsed.data.addressLine,
        allergies: parsed.data.allergies,
        notes: parsed.data.notes,
        updatedAt: new Date(),
      })
      .where(
        and(eq(patients.id, patientId), eq(patients.clinicId, clinic.id)),
      )
      .returning({ id: patients.id });

    if (result.length === 0) {
      return { ok: false, error: "That patient no longer exists." };
    }

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true, patientId };
  } catch (error) {
    return toResult(error);
  }
}
