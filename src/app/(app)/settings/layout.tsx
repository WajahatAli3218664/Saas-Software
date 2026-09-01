import { SettingsNav } from "./settings-nav";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const { member } = await requireTenantSession();

  const tabs = [{ href: "/settings", label: "Clinic" }];
  if (can(member, "staff:manage")) {
    tabs.push({ href: "/settings/staff", label: "Staff & access" });
  }
  if (can(member, "billing:manage")) {
    tabs.push({ href: "/settings/billing", label: "Plan & billing" });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Settings
        </h1>
      </header>
      <SettingsNav tabs={tabs} />
      {children}
    </div>
  );
}
