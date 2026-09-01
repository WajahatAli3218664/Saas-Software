import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  patients,
  payments,
  members,
} from "@/db/schema";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { InvoiceSheet } from "./invoice-sheet";
import { InvoiceActions } from "./invoice-actions";

// Every render here depends on the signed-in tenant and must never
// be cached or shared across requests.
export const dynamic = "force-dynamic";

/**
 * The document title, which Chrome and every other browser use as the
 * default filename when the print dialog's destination is "Save as PDF" —
 * this is what puts the invoice number and patient name into the saved
 * file's name without the operator typing it in.
 */
export async function generateMetadata({
  params,
}: PageProps<"/billing/[id]">) {
  const { id } = await params;
  const { clinic } = await requireTenantSession();

  const [invoice] = await db
    .select({ number: invoices.number, patientId: invoices.patientId })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.clinicId, clinic.id)))
    .limit(1);

  if (!invoice) return { title: "Invoice" };

  const patient = invoice.patientId
    ? await db
        .select({ fullName: patients.fullName })
        .from(patients)
        .where(eq(patients.id, invoice.patientId))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  const title = patient
    ? `${invoice.number} — ${patient.fullName}`
    : invoice.number;

  // .absolute skips the layout's "%s · AesthetIQ" template — the saved PDF's
  // filename should be the invoice itself, not padded with the brand name.
  return { title: { absolute: title } };
}

export default async function InvoicePage({ params }: PageProps<"/billing/[id]">) {
  const { id } = await params;
  const { clinic, member } = await requireTenantSession();

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.clinicId, clinic.id)))
    .limit(1);

  if (!invoice) notFound();

  const [items, paymentRows, patient, issuer] = await Promise.all([
    db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(asc(invoiceItems.sortOrder)),

    db
      .select({
        id: payments.id,
        amount: payments.amount,
        method: payments.method,
        reference: payments.reference,
        receivedAt: payments.receivedAt,
        receivedByName: members.fullName,
      })
      .from(payments)
      .leftJoin(members, eq(payments.receivedBy, members.id))
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(asc(payments.receivedAt)),

    invoice.patientId
      ? db
          .select()
          .from(patients)
          .where(eq(patients.id, invoice.patientId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),

    invoice.createdBy
      ? db
          .select({ fullName: members.fullName })
          .from(members)
          .where(eq(members.id, invoice.createdBy))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  const outstanding = invoice.total - invoice.amountPaid;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href="/billing"
            className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Billing
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-mono text-2xl font-semibold tracking-tight">
              {invoice.number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        <InvoiceActions
          invoiceId={invoice.id}
          invoiceNumber={invoice.number}
          patientName={patient?.fullName ?? null}
          outstanding={outstanding}
          currency={clinic.currency}
          status={invoice.status}
          canRecordPayment={can(member, "payment:record")}
          canVoid={can(member, "invoice:void")}
        />
      </header>

      <InvoiceSheet
        clinic={clinic}
        invoice={invoice}
        items={items}
        patient={patient}
        issuerName={issuer?.fullName ?? null}
      />

      {paymentRows.length > 0 && (
        <section className="bg-card no-print rounded-lg border">
          <header className="border-b px-4 py-2.5">
            <h2 className="text-sm font-medium">Payments</h2>
          </header>
          <table className="w-full text-sm">
            <tbody>
              {paymentRows.map((payment) => (
                <tr key={payment.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    {payment.receivedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: clinic.timezone,
                    })}
                    <div className="text-muted-foreground text-xs capitalize">
                      {payment.method.replace("_", " ")}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                      {payment.receivedByName
                        ? ` · ${payment.receivedByName}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatMoney(payment.amount, clinic.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
