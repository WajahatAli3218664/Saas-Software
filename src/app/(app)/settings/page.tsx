import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ClinicForm } from "./clinic-form";

// Every render here depends on the signed-in tenant and must never
// be cached or shared across requests.
export const dynamic = "force-dynamic";

export const metadata = { title: "Clinic settings" };

export default async function ClinicSettingsPage() {
  const { clinic, member } = await requireTenantSession();

  if (!can(member, "clinic:manage")) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        You do not have permission to change clinic settings.
      </p>
    );
  }

  return <ClinicForm clinic={clinic} />;
}
