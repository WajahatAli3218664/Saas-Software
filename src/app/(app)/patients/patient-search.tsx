"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PatientSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  // Debounced so typing a name does not fire a query per keystroke.
  useEffect(() => {
    if (value === defaultValue) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams();
        if (value.trim()) params.set("q", value.trim());
        router.replace(params.toString() ? `/patients?${params}` : "/patients");
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [value, defaultValue, router]);

  return (
    <div className="relative max-w-sm">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name, phone or code…"
        className="pl-8"
        aria-label="Search patients"
      />
    </div>
  );
}
