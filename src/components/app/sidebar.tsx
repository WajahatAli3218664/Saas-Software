"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Receipt,
  CalendarDays,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const ICONS = {
  dashboard: LayoutDashboard,
  services: Sparkles,
  patients: Users,
  billing: Receipt,
  appointments: CalendarDays,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        // A section stays lit while you are anywhere inside it, so a patient
        // detail page still shows you are under Patients.
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
              active
                ? "text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="bg-sidebar-accent absolute inset-0 rounded-md"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <Icon
              className={cn(
                "relative size-4 shrink-0 transition-colors",
                active ? "text-primary" : "",
              )}
              aria-hidden
            />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
