"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Menu, Stethoscope } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav, type NavItem } from "./sidebar";

export function MobileNav({
  items,
  clinicName,
}: {
  items: NavItem[];
  clinicName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating inside the sheet should dismiss it, not leave it covering the
  // page it just moved to.
  useEffect(() => setOpen(false), [pathname]);

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
        <SheetHeader className="h-14 flex-row items-center gap-2 space-y-0 border-b px-4">
          <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-md">
            <Stethoscope className="size-4" aria-hidden />
          </span>
          <SheetTitle className="font-display truncate text-base">
            {clinicName}
          </SheetTitle>
        </SheetHeader>
        <div className="px-3 py-2">
          <SidebarNav items={items} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
