import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clinics, members } from "@/db/schema";
import type { MemberRole } from "@/db/schema";
import { provisionClinic, ensureMember } from "@/lib/tenant";

/** Clerk's org roles are coarser than ours; map rather than trust the string. */
function mapRole(clerkRole: string | undefined): MemberRole {
  return clerkRole === "org:admin" ? "admin" : "staff";
}

export async function POST(req: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(req);
  } catch {
    // A failed signature check is the one case where the body must not be
    // trusted at all — say nothing about why.
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "organization.created": {
        const org = event.data;
        const creatorId = org.created_by;
        if (!creatorId) break;

        // The webhook carries the org but not the creator's profile, so the
        // remaining fields are filled in on their first sign-in.
        await provisionClinic({
          clerkOrgId: org.id,
          clerkUserId: creatorId,
          name: org.name,
          email: "",
          fullName: org.name,
          avatarUrl: org.image_url ?? null,
        });
        break;
      }

      case "organization.updated": {
        const org = event.data;
        await db
          .update(clinics)
          .set({ name: org.name, updatedAt: new Date() })
          .where(eq(clinics.clerkOrgId, org.id));
        break;
      }

      case "organization.deleted": {
        const org = event.data;
        if (org.id) {
          await db.delete(clinics).where(eq(clinics.clerkOrgId, org.id));
        }
        break;
      }

      case "organizationMembership.created": {
        const membership = event.data;
        const [clinic] = await db
          .select()
          .from(clinics)
          .where(eq(clinics.clerkOrgId, membership.organization.id))
          .limit(1);
        if (!clinic) break;

        const user = membership.public_user_data;
        await ensureMember(clinic.id, {
          clerkUserId: user.user_id,
          email: user.identifier,
          fullName:
            [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            user.identifier,
          avatarUrl: user.image_url ?? null,
          role: mapRole(membership.role),
        });
        break;
      }

      case "organizationMembership.deleted": {
        const membership = event.data;
        const [clinic] = await db
          .select()
          .from(clinics)
          .where(eq(clinics.clerkOrgId, membership.organization.id))
          .limit(1);
        if (!clinic) break;

        // Deactivate rather than delete: invoices and appointments reference
        // the member, and the audit trail should survive them leaving.
        await db
          .update(members)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(members.clinicId, clinic.id),
              eq(members.clerkUserId, membership.public_user_data.user_id),
            ),
          );
        break;
      }

      case "user.updated": {
        const user = event.data;
        const email =
          user.email_addresses?.find(
            (e) => e.id === user.primary_email_address_id,
          )?.email_address ?? user.email_addresses?.[0]?.email_address;

        await db
          .update(members)
          .set({
            fullName:
              [user.first_name, user.last_name].filter(Boolean).join(" ") ||
              email ||
              "Unnamed",
            avatarUrl: user.image_url ?? null,
            ...(email ? { email } : {}),
            updatedAt: new Date(),
          })
          .where(eq(members.clerkUserId, user.id));
        break;
      }
    }
  } catch (error) {
    console.error(`[clerk-webhook] ${event.type} failed`, error);
    // 500 so Clerk retries — a dropped membership event would leave someone
    // unable to sign in.
    return new NextResponse("Handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
