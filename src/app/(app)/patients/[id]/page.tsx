import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, TriangleAlert } from "lucide-react";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { patients, invoices } from "@/db/schema";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { PatientDialog } from "../patient-dialog";

// Every render here depends on the signed-in tenant and must never
// be cached or shared across requests.
export const dynamic = "force-dynamic";

export const metadata = { title: "Patient" };

export default async function PatientPage({
  params,
}: PageProps<"/patients/[id]">) {
  const { id } = await params;
  const { clinic, member } = await requireTenantSession();

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.clinicId, clinic.id)))
    .limit(1);

  if (!patient) notFound();

  const [history, [totals]] = await Promise.all([
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        issuedAt: invoices.issuedAt,
      })
      .from(invoices)
      .where(eq(invoices.patientId, patient.id))
      .orderBy(desc(invoices.issuedAt))
      .limit(50),

    db
      .select({
        spent: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
        owed: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)::int`,
        visits: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.patientId, patient.id),
          sql`${invoices.status} <> 'void'`,
        ),
      ),
  ]);

  // Captured once for this request rather than read during render, which
  // would make the component non-idempotent.
  const renderedAt = new Date();
  const age = patient.dateOfBirth
    ? Math.floor(
        (renderedAt.getTime() - patient.dateOfBirth.getTime()) /
          31_557_600_000,
      )
    : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href="/patients"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Patients
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              {patient.fullName}
            </h1>
            <p className="text-muted-foreground text-sm">
              <span className="font-mono">{patient.code}</span>
              {patient.phone && ` · ${patient.phone}`}
              {age !== null && ` · ${age} years`}
              {patient.gender && ` · ${patient.gender}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {can(member, "patient:edit") && (
              <PatientDialog
                patient={{
                  id: patient.id,
                  fullName: patient.fullName,
                  phone: patient.phone,
                  email: patient.email,
                  gender: patient.gender,
                  dateOfBirth: patient.dateOfBirth,
                  city: patient.city,
                  addressLine: patient.addressLine,
                  allergies: patient.allergies,
                  notes: patient.notes,
                }}
              />
            )}
            <Button asChild size="sm">
              <Link href="/billing/new">
                <Plus className="size-4" aria-hidden />
                New invoice
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {patient.allergies && (
        <div className="border-destructive/25 bg-destructive/8 flex items-start gap-2.5 rounded-lg border px-4 py-3">
          <TriangleAlert
            className="text-destructive mt-0.5 size-4 shrink-0"
            aria-hidden
          />
          <div>
            <p className="text-destructive text-sm font-medium">Allergies</p>
            <p className="text-sm">{patient.allergies}</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Visits" value={String(totals?.visits ?? 0)} />
        <Tile
          label="Total spent"
          value={formatMoney(totals?.spent ?? 0, clinic.currency)}
        />
        <Tile
          label="Outstanding"
          value={formatMoney(totals?.owed ?? 0, clinic.currency)}
          warn={(totals?.owed ?? 0) > 0}
        />
      </div>

      {patient.notes && (
        <section className="bg-card rounded-lg border p-4">
          <h2 className="mb-1.5 text-sm font-medium">Notes</h2>
          <p className="text-muted-foreground text-sm whitespace-pre-line">
            {patient.notes}
          </p>
        </section>
      )}

      <section className="bg-card rounded-lg border">
        <header className="border-b px-4 py-2.5">
          <h2 className="text-sm font-medium">Treatment history</h2>
        </header>

        {history.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            No invoices for this patient yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {history.map((invoice) => (
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
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatMoney(invoice.total, clinic.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-card flex flex-col gap-0.5 rounded-lg border p-4">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span
        className={`font-display text-xl font-semibold tabular-nums ${warn ? "text-warning" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
