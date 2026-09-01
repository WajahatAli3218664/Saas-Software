import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  getDashboardStats,
  getRecentInvoices,
  getRevenueTrend,
  getTopServices,
} from "@/lib/queries";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { StatTile, Sparkline } from "@/components/app/stat-tile";
import { InvoiceStatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { clinic, member } = await requireTenantSession();
  const currency = clinic.currency;
  const showMoney = can(member, "report:view");

  const [stats, trend, recent, top] = await Promise.all([
    getDashboardStats(clinic.id, clinic.timezone),
    getRevenueTrend(clinic.id, clinic.timezone),
    getRecentInvoices(clinic.id),
    getTopServices(clinic.id, clinic.timezone),
  ]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: clinic.timezone,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Good day, {member.fullName.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm">{today}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/billing/new">
            <Plus className="size-4" aria-hidden />
            New invoice
          </Link>
        </Button>
      </header>

      <section
        aria-label="Today at a glance"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatTile
          label="Today's takings"
          value={
            showMoney ? formatMoney(stats.todayRevenue, currency) : "—"
          }
          meta={`${stats.todayInvoices} ${stats.todayInvoices === 1 ? "invoice" : "invoices"} · ${stats.todayPatients} ${stats.todayPatients === 1 ? "patient" : "patients"}`}
          chart={
            showMoney ? <Sparkline points={trend.map((t) => t.total)} /> : null
          }
        />
        <StatTile
          label="Outstanding"
          value={
            showMoney
              ? formatMoney(stats.outstandingAmount, currency)
              : String(stats.outstandingCount)
          }
          meta={`Across ${stats.outstandingCount} ${stats.outstandingCount === 1 ? "invoice" : "invoices"}`}
          tone={stats.outstandingAmount > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="This month"
          value={
            showMoney ? formatMoneyCompact(stats.monthRevenue, currency) : "—"
          }
          meta="Since the 1st"
          tone={stats.monthRevenue > 0 ? "positive" : "neutral"}
        />
        <StatTile
          label="Patients"
          value={String(stats.totalPatients)}
          meta={`${stats.activeServices} services on the menu`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="bg-card min-w-0 rounded-lg border">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Recent invoices</h2>
            <Link
              href="/billing"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              All invoices
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </header>

          {recent.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              body="Bill your first patient and it will appear here."
              action={{ href: "/billing/new", label: "Create an invoice" }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground border-b text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Invoice</th>
                    <th className="px-4 py-2 text-left font-medium">Patient</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((invoice) => (
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
                            timeZone: clinic.timezone,
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {invoice.patientName ?? (
                          <span className="text-muted-foreground">
                            Walk-in
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(invoice.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-card rounded-lg border">
          <header className="border-b px-4 py-3">
            <h2 className="font-medium">Top treatments</h2>
            <p className="text-muted-foreground text-xs">Last 30 days</p>
          </header>

          {top.length === 0 ? (
            <EmptyState
              title="Nothing billed yet"
              body="Your best-selling treatments will be ranked here."
            />
          ) : (
            <ul className="divide-y">
              {top.map((service) => {
                const share = (service.revenue / (top[0].revenue || 1)) * 100;
                return (
                  <li key={service.name} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">
                        {service.name}
                      </span>
                      <span className="text-sm tabular-nums">
                        {showMoney
                          ? formatMoneyCompact(service.revenue, currency)
                          : `${service.quantity}×`}
                      </span>
                    </div>
                    <div className="bg-muted mt-1.5 h-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.max(share, 3)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground max-w-xs text-sm">{body}</p>
      {action && (
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
