import Image from "next/image";
import type { Clinic, Invoice, InvoiceItem, Patient } from "@/db/schema";
import { formatMoney } from "@/lib/money";

/**
 * The invoice as it appears on paper. Rendered on screen too, so what the
 * operator checks is exactly what the printer produces — the print stylesheet
 * only strips the surrounding chrome.
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

  const issued = invoice.issuedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: clinic.timezone,
  });

  return (
    <article className="print-sheet bg-card rounded-lg border p-6 sm:p-8 print:rounded-none print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div className="flex items-start gap-3">
          {clinic.logoUrl && (
            <Image
              src={clinic.logoUrl}
              alt=""
              width={48}
              height={48}
              className="size-12 rounded-md object-contain"
              unoptimized
            />
          )}
          <div>
            <h2 className="font-display text-lg font-semibold">
              {clinic.name}
            </h2>
            <div className="text-muted-foreground text-xs leading-relaxed">
              {clinic.addressLine && <div>{clinic.addressLine}</div>}
              {clinic.city && <div>{clinic.city}</div>}
              {clinic.phone && <div>{clinic.phone}</div>}
              {clinic.taxNumber && (
                <div>
                  {clinic.taxLabel ?? "Tax No"}: {clinic.taxNumber}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-muted-foreground text-xs tracking-wide uppercase">
            Invoice
          </div>
          <div className="font-mono text-sm font-semibold">
            {invoice.number}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">{issued}</div>
          {invoice.status === "void" && (
            <div className="text-destructive mt-1 text-xs font-semibold tracking-wide uppercase">
              Void
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-wrap justify-between gap-4 border-b py-4">
        <div>
          <div className="text-muted-foreground text-xs tracking-wide uppercase">
            Billed to
          </div>
          {patient ? (
            <>
              <div className="font-medium">{patient.fullName}</div>
              <div className="text-muted-foreground text-xs">
                {patient.code}
                {patient.phone ? ` · ${patient.phone}` : ""}
              </div>
            </>
          ) : (
            <div className="font-medium">Walk-in</div>
          )}
        </div>

        {issuerName && (
          <div className="text-right">
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              Issued by
            </div>
            <div className="text-sm">{issuerName}</div>
          </div>
        )}
      </div>

      <table className="w-full py-4 text-sm">
        <thead className="text-muted-foreground border-b text-xs uppercase">
          <tr>
            <th className="py-2 text-left font-medium">Treatment</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Price</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="avoid-break border-b last:border-0">
              <td className="py-2.5">
                {item.name}
                {item.discountAmount > 0 && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    less {formatMoney(item.discountAmount, currency)}
                  </span>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {item.quantity}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {formatMoney(item.unitPrice, currency)}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {formatMoney(item.lineTotal, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end pt-4">
        <dl className="flex w-full max-w-xs flex-col gap-1.5 text-sm">
          <Row
            label="Subtotal"
            value={formatMoney(invoice.subtotal, currency)}
          />
          {invoice.discountAmount > 0 && (
            <Row
              label="Discount"
              value={`−${formatMoney(invoice.discountAmount, currency)}`}
            />
          )}
          {invoice.taxAmount > 0 && (
            <Row
              label={`${clinic.taxLabel ?? "Tax"} (${Number(clinic.taxPercent)}%)`}
              value={formatMoney(invoice.taxAmount, currency)}
            />
          )}
          <div className="mt-1 flex items-baseline justify-between border-t pt-2">
            <dt className="font-medium">Total</dt>
            <dd className="font-display text-lg font-semibold tabular-nums">
              {formatMoney(invoice.total, currency)}
            </dd>
          </div>
          {invoice.amountPaid > 0 && (
            <Row
              label="Paid"
              value={formatMoney(invoice.amountPaid, currency)}
            />
          )}
          {outstanding > 0 && invoice.status !== "void" && (
            <div className="flex items-baseline justify-between font-medium">
              <dt>Balance due</dt>
              <dd className="tabular-nums">
                {formatMoney(outstanding, currency)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {(invoice.notes || clinic.invoiceFooter) && (
        <footer className="text-muted-foreground mt-6 border-t pt-4 text-xs leading-relaxed">
          {invoice.notes && <p>{invoice.notes}</p>}
          {clinic.invoiceFooter && <p>{clinic.invoiceFooter}</p>}
        </footer>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
