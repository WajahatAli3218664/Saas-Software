import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Stethoscope } from "lucide-react";
import { ensureClinicForSession } from "@/lib/ensure-clinic";
import { can } from "@/lib/permissions";
import { SidebarNav, type NavItem } from "@/components/app/sidebar";
import { TrialBanner } from "@/components/app/trial-banner";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { MobileNav } from "@/components/app/mobile-nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Middleware has already sent anyone without an org to onboarding. Reaching
  // here with an org but no clinic means the provisioning webhook has not
  // landed, so provision on the spot rather than bouncing them in a loop.
  const session = await ensureClinicForSession();
  if (!session) redirect("/onboarding");

  const { clinic, member, subscription } = session;

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { href: "/appointments", label: "Appointments", icon: "appointments" },
    { href: "/patients", label: "Patients", icon: "patients" },
    { href: "/billing", label: "Billing", icon: "billing" },
    { href: "/services", label: "Services", icon: "services" },
  ];

  if (can(member, "report:view")) {
    items.push({ href: "/reports", label: "Reports", icon: "reports" });
  }

  if (can(member, "clinic:manage") || can(member, "staff:manage")) {
    items.push({ href: "/settings", label: "Settings", icon: "settings" });
  }

  return (
    <div className="flex min-h-full flex-col">
      <TrialBanner subscription={subscription} />

      <div className="flex flex-1">
        <aside className="bg-sidebar no-print hidden w-60 shrink-0 flex-col border-r lg:flex">
          <div className="flex h-14 items-center gap-2 px-4">
            <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-md">
              <Stethoscope className="size-4" aria-hidden />
            </span>
            <span className="font-display truncate text-base font-semibold">
              {clinic.name}
            </span>
          </div>
          <div className="flex-1 px-3 py-2">
            <SidebarNav items={items} />
          </div>
          <div className="text-muted-foreground border-t px-4 py-3 text-xs">
            <span className="capitalize">{member.role}</span> · {member.fullName}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
            <MobileNav items={items} clinicName={clinic.name} />
            <Link
              href="/dashboard"
              className="font-display truncate font-semibold lg:hidden"
            >
              {clinic.name}
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
