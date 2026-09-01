import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, patients } from "@/db/schema";
import { requireTenantSession } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const { clinic } = await requireTenantSession();

  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      issuedAt: invoices.issuedAt,
      patientName: patients.fullName,
      patientCode: patients.code,
    })
    .from(invoices)
    .leftJoin(patients, eq(invoices.patientId, patients.id))
    .where(eq(invoices.clinicId, clinic.id))
    .orderBy(desc(invoices.issuedAt))
    .limit(200);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Billing
          </h1>
          <p className="text-muted-foreground text-sm">
            {rows.length === 200
              ? "Most recent 200 invoices"
              : `${rows.length} ${rows.length === 1 ? "invoice" : "invoices"}`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/billing/new">
            <Plus className="size-4" aria-hidden />
            New invoice
          </Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-lg border px-6 py-16 text-center">
          <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
            <Receipt className="size-5" aria-hidden />
          </span>
          <p className="font-medium">No invoices yet</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Bill your first patient and it will show up here, ready to print.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/billing/new">Create an invoice</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-card overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Invoice</th>
                <th className="px-4 py-2.5 text-left font-medium">Patient</th>
                <th className="px-4 py-2.5 text-left font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Outstanding
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => {
                const outstanding = invoice.total - invoice.amountPaid;
                return (
                  <tr
                    key={invoice.id}
                    className="hover:bg-muted/40 border-b last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/billing/${invoice.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {invoice.number}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {invoice.issuedAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          timeZone: clinic.timezone,
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {invoice.patientName ? (
                        <>
                          <div>{invoice.patientName}</div>
                          <div className="text-muted-foreground font-mono text-xs">
                            {invoice.patientCode}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {invoice.status === "void" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : outstanding > 0 ? (
                        <span className="text-warning">
                          {formatMoney(outstanding, clinic.currency)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatMoney(invoice.total, clinic.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
