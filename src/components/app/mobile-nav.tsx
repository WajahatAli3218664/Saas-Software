"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { OrganizationSwitcher } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav, type NavItem } from "./sidebar";

export function MobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [state, setState] = useState({ open: false, pathname });

  // Navigating inside the sheet should dismiss it rather than leave it
  // covering the page it just moved to. Resetting during render on a changed
  // pathname avoids an effect that would flash the sheet open for a frame.
  if (state.pathname !== pathname) {
    setState({ open: false, pathname });
  }

  const open = state.open;
  const setOpen = (next: boolean) => setState({ open: next, pathname });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-14 flex-row items-center gap-2 space-y-0 border-b px-3">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/dashboard"
            afterCreateOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger: "w-full justify-start px-1",
                organizationPreviewMainIdentifier:
                  "font-display font-semibold",
              },
            }}
          />
        </SheetHeader>
        <div className="px-3 py-2">
          <SidebarNav items={items} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
