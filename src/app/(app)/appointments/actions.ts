"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, appointmentServices, services } from "@/db/schema";
import { requireActivePermission, SubscriptionLapsedError } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";

export interface ActionResult {
  ok: boolean;
  error?: string;
  appointmentId?: string;
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
  console.error("[appointments-action]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  practitionerId: z.string().uuid().nullable(),
  startsAt: z.string().min(1, "Pick a time"),
  serviceIds: z.array(z.string().uuid()),
  notes: z.string().trim().max(1000).nullable(),
});

export async function createAppointment(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { clinic, member } =
      await requireActivePermission("appointment:manage");

    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the details.",
      };
    }

    const startsAt = new Date(parsed.data.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return { ok: false, error: "That is not a valid time." };
    }

    // Duration comes from the treatments booked, so the calendar block matches
    // how long the chair is actually occupied.
    const chosen = parsed.data.serviceIds.length
      ? await db
          .select()
          .from(services)
          .where(
            and(
              eq(services.clinicId, clinic.id),
              eq(services.isActive, true),
            ),
          )
          .then((rows) =>
            rows.filter((s) => parsed.data.serviceIds.includes(s.id)),
          )
      : [];

    const minutes =
      chosen.reduce((sum, s) => sum + s.durationMinutes, 0) || 30;
    const endsAt = new Date(startsAt.getTime() + minutes * 60_000);

    const appointmentId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(appointments)
        .values({
          clinicId: clinic.id,
          patientId: parsed.data.patientId,
          practitionerId: parsed.data.practitionerId,
          startsAt,
          endsAt,
          notes: parsed.data.notes,
          createdBy: member.id,
        })
        .returning();

      if (chosen.length > 0) {
        await tx.insert(appointmentServices).values(
          chosen.map((service) => ({
            clinicId: clinic.id,
            appointmentId: created.id,
            serviceId: service.id,
            serviceName: service.name,
            price: service.price,
          })),
        );
      }

      return created.id;
    });

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    return { ok: true, appointmentId };
  } catch (error) {
    return toResult(error);
  }
}

const STATUSES = [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
] as const;

export async function setAppointmentStatus(
  appointmentId: string,
  status: (typeof STATUSES)[number],
): Promise<ActionResult> {
  try {
    const { clinic } = await requireActivePermission("appointment:manage");

    if (!STATUSES.includes(status)) {
      return { ok: false, error: "That is not a valid status." };
    }

    const updated = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(appointments.id, appointmentId),
          eq(appointments.clinicId, clinic.id),
        ),
      )
      .returning({ id: appointments.id });

    if (updated.length === 0) {
      return { ok: false, error: "That appointment no longer exists." };
    }

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    return { ok: true, appointmentId };
  } catch (error) {
    return toResult(error);
  }
}
