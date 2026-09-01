"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import { setAppointmentStatus } from "./actions";
import type { appointmentStatusEnum } from "@/db/schema";

type Status = (typeof appointmentStatusEnum.enumValues)[number];

/** Ordered as the day actually runs, so the next step is always near the top. */
const OPTIONS: Array<{ value: Status; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

export function AppointmentStatusMenu({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: Status;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        aria-label="Change status"
      >
        <AppointmentStatusBadge status={status} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            disabled={option.value === status}
            onSelect={() => {
              startTransition(async () => {
                const result = await setAppointmentStatus(
                  appointmentId,
                  option.value,
                );
                if (!result.ok) {
                  toast.error(result.error ?? "Could not update that.");
                  return;
                }
                toast.success(`Marked ${option.label.toLowerCase()}`);
              });
            }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
