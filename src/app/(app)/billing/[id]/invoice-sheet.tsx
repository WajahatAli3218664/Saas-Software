import Image from "next/image";
import type { Clinic, Invoice, InvoiceItem, Patient } from "@/db/schema";
import { formatMoney } from "@/lib/money";

/**
 * The invoice as it appears on paper. Rendered on screen too, so what the
 * operator checks is exactly what gets saved — the print stylesheet only
 * strips the surrounding chrome, and the same markup is what "Print" renders
 * to a PDF.
 *
 * Styled as a receipt rather than a corporate invoice: a single narrow
 * column, a perforated top edge, and a torn-paper foot — the shape a patient
 * actually expects to be handed at the front desk, scaled up to something
 * that reads well as a full A4 sheet or PDF.
 */
export function InvoiceSheet({
  clinic,
  invoice,
  items,
  patient,
  issuerName,
}: {
  clinic: Clinic;
  invoice: Invoice;
  items: InvoiceItem[];
  patient: Patient | null;
  issuerName: string | null;
}) {
  const currency = clinic.currency;
  const outstanding = invoice.total - invoice.amountPaid;
  const isVoid = invoice.status === "void";

  const issued = invoice.issuedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: clinic.timezone,
  });
  const issuedTime = invoice.issuedAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: clinic.timezone,
  });

  return (
    <div className="print-sheet flex justify-center">
      <article
        id="invoice-sheet"
        className="relative w-full max-w-md overflow-hidden print:max-w-none"
      >
        {/* Perforated top edge — the visual cue that this is a tear-off
            receipt, not a letterhead. A row of small circles rather than a
            CSS mask, since mask-image support is inconsistent once the
            canvas-capture step (Print) rasterizes this element. */}
        <PerforationEdge position="top" />

        <div className="bg-card border-x px-7 pt-7 pb-8 print:border-0 print:px-0 print:pt-0 sm:px-9">
          {isVoid && (
            <div className="border-destructive/40 text-destructive absolute top-10 right-6 -rotate-12 rounded border-2 px-3 py-0.5 font-mono text-sm font-bold tracking-[0.2em] uppercase opacity-70">
              Void
            </div>
          )}

          {/* Clinic identity */}
          <header className="flex flex-col items-center gap-2 text-center">
            {clinic.logoUrl ? (
              <Image
                src={clinic.logoUrl}
                alt=""
                width={44}
                height={44}
                className="size-11 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full text-lg font-semibold">
                {clinic.name.charAt(0)}
              </span>
            )}
            <h2 className="font-display text-xl leading-tight font-semibold">
              {clinic.name}
            </h2>
            <p className="text-muted-foreground max-w-[26ch] text-xs leading-relaxed">
              {[clinic.addressLine, clinic.city].filter(Boolean).join(", ")}
              {clinic.phone && (
                <>
                  <br />
                  {clinic.phone}
                </>
              )}
            </p>
          </header>

          <Perforation />

          {/* Invoice + patient meta, receipt-style label/value pairs */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[0.8rem]">
            <MetaRow label="Invoice">{invoice.number}</MetaRow>
            <MetaRow label="Date" align="right">
              {issued}
            </MetaRow>
            <MetaRow label="Patient">
              {patient ? patient.fullName : "Walk-in"}
            </MetaRow>
            <MetaRow label="Time" align="right">
              {issuedTime}
            </MetaRow>
            {patient?.code && <MetaRow label="ID">{patient.code}</MetaRow>}
            {issuerName && (
              <MetaRow label="Served by" align={patient?.code ? "right" : undefined}>
                {issuerName}
              </MetaRow>
            )}
          </dl>

          <Perforation />

          {/* Line items — quantity × unit price stacked under the name, the
              way a receipt sets it rather than a four-column table. */}
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className="avoid-break flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-muted-foreground font-mono text-[0.72rem]">
                    {item.quantity} × {formatMoney(item.unitPrice, currency)}
                    {item.discountAmount > 0 && (
                      <span className="text-success">
                        {" "}
                        · −{formatMoney(item.discountAmount, currency)}
                      </span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                  {formatMoney(item.lineTotal, currency)}
                </span>
              </li>
            ))}
          </ul>

          <Perforation />

          {/* Totals — the one place the accent color is spent. */}
          <dl className="flex flex-col gap-1.5 font-mono text-sm">
            <TotalRow label="Subtotal" value={formatMoney(invoice.subtotal, currency)} />
            {invoice.discountAmount > 0 && (
              <TotalRow
                label="Discount"
                value={`−${formatMoney(invoice.discountAmount, currency)}`}
                tone="success"
              />
            )}
            {invoice.taxAmount > 0 && (
              <TotalRow
                label={`${clinic.taxLabel ?? "Tax"} ${Number(clinic.taxPercent)}%`}
                value={formatMoney(invoice.taxAmount, currency)}
              />
            )}
          </dl>

          <div className="border-primary/25 mt-3 flex items-baseline justify-between border-t-2 border-dashed pt-3">
            <dt className="font-display text-base font-semibold">Total</dt>
            <dd className="text-primary font-display text-2xl font-bold tabular-nums">
              {formatMoney(invoice.total, currency)}
            </dd>
          </div>

          {invoice.amountPaid > 0 && (
            <div className="mt-2 flex items-baseline justify-between font-mono text-xs">
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="tabular-nums">
                {formatMoney(invoice.amountPaid, currency)}
              </dd>
            </div>
          )}
          {outstanding > 0 && !isVoid && (
            <div className="bg-warning/10 mt-2 flex items-baseline justify-between rounded-md px-3 py-1.5 font-mono text-xs font-semibold">
              <dt className="text-warning">Balance due</dt>
              <dd className="text-warning tabular-nums">
                {formatMoney(outstanding, currency)}
              </dd>
            </div>
          )}

          {(invoice.notes || clinic.invoiceFooter) && (
            <>
              <Perforation />
              <footer className="text-muted-foreground space-y-1 text-center text-[0.72rem] leading-relaxed">
                {invoice.notes && <p>{invoice.notes}</p>}
                {clinic.invoiceFooter && <p>{clinic.invoiceFooter}</p>}
              </footer>
            </>
          )}

          <p className="text-muted-foreground/70 mt-6 text-center font-mono text-[0.65rem] tracking-widest uppercase">
            Thank you
          </p>
        </div>

        {/* Torn-paper foot, mirroring the perforated header. */}
        <PerforationEdge position="bottom" />
      </article>
    </div>
  );
}

/**
 * A row of small punched-out circles along the sheet's top or bottom edge —
 * built from real elements (not a CSS mask) so html2canvas-pro rasterizes it
 * faithfully when "Print" captures the sheet to a PDF.
 */
function PerforationEdge({ position }: { position: "top" | "bottom" }) {
  const dots = Array.from({ length: 22 });
  return (
    <div
      aria-hidden
      className="bg-card relative flex justify-center gap-[7px] overflow-hidden px-2 print:hidden"
      style={{ height: 12 }}
    >
      {dots.map((_, i) => (
        <span
          key={i}
          className="bg-background size-3 shrink-0 rounded-full"
          style={{
            marginTop: position === "top" ? -6 : undefined,
            marginBottom: position === "bottom" ? -6 : undefined,
          }}
        />
      ))}
    </div>
  );
}

/** A dashed rule standing in for the tear line between receipt sections. */
function Perforation() {
  return (
    <div
      aria-hidden
      className="border-border/70 my-4 border-t border-dashed"
    />
  );
}

function MetaRow({
  label,
  align,
  children,
}: {
  label: string;
  align?: "right";
  children: React.ReactNode;
}) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <dt className="text-muted-foreground text-[0.65rem] tracking-wide uppercase">
        {label}
      </dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}

function TotalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={tone === "success" ? "text-success" : undefined}>
        {value}
      </dd>
    </div>
  );
}
