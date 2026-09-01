"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function RangePicker({ value }: { value: string }) {
  return (
    <div
      className="bg-muted/60 inline-flex rounded-full p-1"
      role="group"
      aria-label="Reporting period"
    >
      {OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={`/reports?range=${option.value}`}
          aria-current={value === option.value ? "true" : undefined}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
