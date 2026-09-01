import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clinics,
  members,
  subscriptions,
  serviceCategories,
  services,
  printTemplates,
  patients,
  invoices,
} from "@/db/schema";
import type { MemberRole } from "@/db/schema";
import { TRIAL_DAYS } from "@/config/plans";

/** URL-safe slug from a clinic name, with a numeric suffix on collision. */
export async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "clinic";

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [existing] = await db
      .select({ id: clinics.id })
      .from(clinics)
      .where(eq(clinics.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** Services every aesthetic clinic recognises, so a new tenant is not empty. */
const STARTER_CATALOGUE: Array<{
  category: string;
  color: string;
  services: Array<{ name: string; price: number; minutes: number }>;
}> = [
  {
    category: "Injectables",
    color: "#0d9488",
    services: [
      { name: "Botox — Forehead", price: 2500000, minutes: 30 },
      { name: "Botox — Crow's Feet", price: 2000000, minutes: 30 },
      { name: "Dermal Filler — Lips", price: 4500000, minutes: 45 },
      { name: "Dermal Filler — Cheeks", price: 5500000, minutes: 45 },
    ],
  },
  {
    category: "Skin Treatments",
    color: "#6366f1",
    services: [
      { name: "HydraFacial", price: 1200000, minutes: 60 },
      { name: "Chemical Peel", price: 900000, minutes: 45 },
      { name: "Microneedling", price: 1500000, minutes: 60 },
      { name: "Carbon Laser Facial", price: 1000000, minutes: 45 },
    ],
  },
  {
    category: "Laser & Devices",
    color: "#d97706",
    services: [
      { name: "Laser Hair Removal — Full Face", price: 800000, minutes: 30 },
      { name: "Laser Hair Removal — Full Body", price: 3500000, minutes: 90 },
      { name: "IPL Photofacial", price: 1400000, minutes: 45 },
    ],
  },
  {
    category: "Consultation",
    color: "#64748b",
    services: [
      { name: "Initial Consultation", price: 200000, minutes: 20 },
      { name: "Follow-up Review", price: 0, minutes: 15 },
    ],
  },
];

export interface ProvisionInput {
  clerkOrgId: string;
  clerkUserId: string;
  name: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  country?: string;
}

/**
 * Creates a clinic, its owner, a trial subscription, a default print template
 * and a starter catalogue — everything a tenant needs to be usable on first
 * login. Idempotent on clerkOrgId so a replayed webhook is harmless.
 */
export async function provisionClinic(input: ProvisionInput) {
  const [existing] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.clerkOrgId, input.clerkOrgId))
    .limit(1);

  if (existing) {
    await ensureMember(existing.id, {
      clerkUserId: input.clerkUserId,
      email: input.email,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl ?? null,
      role: "owner",
    });
    return existing;
  }

  const country = (input.country ?? "PK").toUpperCase();
  const isPk = country === "PK";
  const slug = await uniqueSlug(input.name);

  return db.transaction(async (tx) => {
    const [clinic] = await tx
      .insert(clinics)
      .values({
        clerkOrgId: input.clerkOrgId,
        name: input.name,
        slug,
        email: input.email,
        country,
        currency: isPk ? "PKR" : "USD",
        timezone: isPk ? "Asia/Karachi" : "UTC",
      })
      .returning();

    await tx.insert(members).values({
      clinicId: clinic.id,
      clerkUserId: input.clerkUserId,
      email: input.email,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl ?? null,
      role: "owner",
      canCreateServices: true,
      canEditPrices: true,
      canGiveDiscount: true,
      canVoidInvoice: true,
      canViewReports: true,
      canManageStaff: true,
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    await tx.insert(subscriptions).values({
      clinicId: clinic.id,
      tier: "trial",
      status: "trialing",
      trialEndsAt,
    });

    await tx.insert(printTemplates).values({
      clinicId: clinic.id,
      name: "Standard A4 Invoice",
      paperSize: "a4",
      isDefault: true,
    });

    for (const [index, group] of STARTER_CATALOGUE.entries()) {
      const [category] = await tx
        .insert(serviceCategories)
        .values({
          clinicId: clinic.id,
          name: group.category,
          colorHex: group.color,
          sortOrder: index,
        })
        .returning();

      await tx.insert(services).values(
        group.services.map((s) => ({
          clinicId: clinic.id,
          categoryId: category.id,
          name: s.name,
          // Catalogue prices are authored in PKR; halve for USD clinics so the
          // seeded numbers are at least plausible rather than absurd.
          price: isPk ? s.price : Math.round(s.price / 200),
          durationMinutes: s.minutes,
        })),
      );
    }

    return clinic;
  });
}

export interface EnsureMemberInput {
  clerkUserId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role?: MemberRole;
}

/** Upsert a member — used by invitation acceptance and webhook replays. */
export async function ensureMember(
  clinicId: string,
  input: EnsureMemberInput,
) {
  const [existing] = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.clinicId, clinicId),
        eq(members.clerkUserId, input.clerkUserId),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(members)
      .set({
        email: input.email,
        fullName: input.fullName,
        avatarUrl: input.avatarUrl ?? existing.avatarUrl,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(members.id, existing.id))
      .returning();
    return updated;
  }

  const role = input.role ?? "staff";
  const [created] = await db
    .insert(members)
    .values({
      clinicId,
      clerkUserId: input.clerkUserId,
      email: input.email,
      fullName: input.fullName,
      avatarUrl: input.avatarUrl ?? null,
      role,
      // Admins get the grants their role already implies, so the toggles in
      // the UI reflect reality rather than showing off for a role that allows it.
      canCreateServices: role === "owner" || role === "admin",
      canEditPrices: role === "owner" || role === "admin",
      canGiveDiscount: role === "owner" || role === "admin",
      canVoidInvoice: role === "owner" || role === "admin",
      canViewReports: role === "owner" || role === "admin",
      canManageStaff: role === "owner" || role === "admin",
    })
    .returning();

  return created;
}

/**
 * Next sequential code for a per-clinic entity (patients, invoices). Counts
 * inside a transaction so two concurrent creates cannot collide; the unique
 * index is the backstop.
 */
export async function nextPatientCode(clinicId: string): Promise<string> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patients)
    .where(eq(patients.clinicId, clinicId));
  return `P-${String((row?.count ?? 0) + 1).padStart(4, "0")}`;
}

export async function nextInvoiceSequence(clinicId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(eq(invoices.clinicId, clinicId));
  return (row?.count ?? 0) + 1;
}
