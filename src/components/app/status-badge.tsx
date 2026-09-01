import { cn } from "@/lib/utils";
import type { invoiceStatusEnum, appointmentStatusEnum } from "@/db/schema";

type InvoiceStatus = (typeof invoiceStatusEnum.enumValues)[number];
type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];

const INVOICE_STYLES: Record<InvoiceStatus, { label: string; class: string }> =
  {
    draft: { label: "Draft", class: "bg-muted text-muted-foreground" },
    unpaid: { label: "Unpaid", class: "bg-warning/12 text-warning" },
    partial: { label: "Part paid", class: "bg-warning/12 text-warning" },
    paid: { label: "Paid", class: "bg-success/12 text-success" },
    refunded: { label: "Refunded", class: "bg-muted text-muted-foreground" },
    void: {
      label: "Void",
      class: "bg-muted text-muted-foreground line-through",
    },
  };

const APPOINTMENT_STYLES: Record<
  AppointmentStatus,
  { label: string; class: string }
> = {
  scheduled: { label: "Scheduled", class: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmed", class: "bg-primary/12 text-primary" },
  checked_in: { label: "Checked in", class: "bg-primary/12 text-primary" },
  in_progress: { label: "In progress", class: "bg-warning/12 text-warning" },
  completed: { label: "Completed", class: "bg-success/12 text-success" },
  cancelled: { label: "Cancelled", class: "bg-muted text-muted-foreground" },
  no_show: { label: "No show", class: "bg-destructive/12 text-destructive" },
};

function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const style = INVOICE_STYLES[status];
  return <Pill label={style.label} className={style.class} />;
}

export function AppointmentStatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const style = APPOINTMENT_STYLES[status];
  return <Pill label={style.label} className={style.class} />;
}
