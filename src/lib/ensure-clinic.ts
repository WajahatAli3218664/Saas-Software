import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { provisionClinic, ensureMember } from "@/lib/tenant";
import { getTenantSession, type TenantSession } from "@/lib/auth";

/**
 * Guarantees a clinic exists for the signed-in organization.
 *
 * The Clerk webhook is what normally provisions a clinic, but a webhook can be
 * unconfigured, delayed, or dropped — and a user whose clinic never arrived
 * would otherwise be stuck at onboarding forever. This closes that gap on the
 * first request that needs a tenant, and is idempotent, so it costs one extra
 * lookup and nothing else once the row exists.
 */
export async function ensureClinicForSession(): Promise<TenantSession | null> {
  const existing = await getTenantSession();
  if (existing) return existing;

  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    email ||
    "Owner";

  const client = await clerkClient();
  const organization = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  // Whoever created the organization owns the clinic; anyone else arriving
  // first is provisioned as a member of it instead.
  const isCreator = organization.createdBy === userId;

  const clinic = await provisionClinic({
    clerkOrgId: orgId,
    clerkUserId: organization.createdBy ?? userId,
    name: organization.name,
    email: isCreator ? email : "",
    fullName: isCreator ? fullName : organization.name,
    avatarUrl: organization.imageUrl ?? null,
  });

  if (!isCreator) {
    await ensureMember(clinic.id, {
      clerkUserId: userId,
      email,
      fullName,
      avatarUrl: user.imageUrl ?? null,
      role: "staff",
    });
  }

  // getTenantSession is request-cached and has already returned null once, so
  // the caller re-reads through a fresh call rather than the cached miss.
  return getTenantSessionUncached();
}

/** Bypasses the per-request cache after a write that created the tenant. */
async function getTenantSessionUncached(): Promise<TenantSession | null> {
  const { db } = await import("@/db");
  const { clinics, members, subscriptions } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.clerkOrgId, orgId))
    .limit(1);
  if (!clinic) return null;

  const [member] = await db
    .select()
    .from(members)
    .where(
      and(eq(members.clinicId, clinic.id), eq(members.clerkUserId, userId)),
    )
    .limit(1);
  if (!member || !member.isActive) return null;

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.clinicId, clinic.id))
    .limit(1);

  return { clinic, member, subscription: subscription ?? null };
}
