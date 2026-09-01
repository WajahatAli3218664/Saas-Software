import { and, eq, gte, lt, ne, sql, desc } from "drizzle-orm";
import { db } from "@/db";
import { invoices, invoiceItems, payments, members } from "@/db/schema";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { dayRange } from "@/lib/queries";
import { formatMoney, formatMoneyCompact } from "@/lib/money";
import { StatTile, Sparkline } from "@/components/app/stat-tile";
import { RangePicker } from "./range-picker";

export const metadata = { title: "Reports" };

const RANGES = { "7": 7, "30": 30, "90": 90 } as const;
type RangeKey = keyof typeof RANGES;

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const { clinic, member } = await requireTenantSession();
  const params = await searchParams;

  if (!can(member, "report:view")) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        You do not have permission to view reports.
      </p>
    );
  }

  const key = (
    typeof params.range === "string" && params.range in RANGES
      ? params.range
      : "30"
  ) as RangeKey;
  const days = RANGES[key];

  const { end } = dayRange(clinic.timezone);
  const from = new Date(end.getTime() - days * 86_400_000);

  const [[totals], daily, topServices, byMethod, byStaff] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
        collected: sql<number>`coalesce(sum(${invoices.amountPaid}), 0)::int`,
        discount: sql<number>`coalesce(sum(${invoices.discountAmount}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.clinicId, clinic.id),
          gte(invoices.issuedAt, from),
          lt(invoices.issuedAt, end),
          ne(invoices.status, "void"),
        ),
      ),

    db
      .select({
        date: sql<string>`to_char(${invoices.issuedAt} at time zone ${clinic.timezone}, 'YYYY-MM-DD')`,
        total: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.clinicId, clinic.id),
          gte(invoices.issuedAt, from),
          lt(invoices.issuedAt, end),
          ne(invoices.status, "void"),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({
        name: invoiceItems.name,
        revenue: sql<number>`coalesce(sum(${invoiceItems.lineTotal}), 0)::int`,
        quantity: sql<number>`coalesce(sum(${invoiceItems.quantity}), 0)::int`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(
        and(
          eq(invoiceItems.clinicId, clinic.id),
          gte(invoices.issuedAt, from),
          lt(invoices.issuedAt, end),
          ne(invoices.status, "void"),
        ),
      )
      .groupBy(invoiceItems.name)
      .orderBy(desc(sql`sum(${invoiceItems.lineTotal})`))
      .limit(10),

    db
      .select({
        method: payments.method,
        amount: sql<number>`coalesce(sum(${payments.amount}), 0)::int`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.clinicId, clinic.id),
          gte(payments.receivedAt, from),
          lt(payments.receivedAt, end),
        ),
      )
      .groupBy(payments.method)
      .orderBy(desc(sql`sum(${payments.amount})`)),

    db
      .select({
        name: members.fullName,
        revenue: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .innerJoin(members, eq(invoices.createdBy, members.id))
      .where(
        and(
          eq(invoices.clinicId, clinic.id),
          gte(invoices.issuedAt, from),
          lt(invoices.issuedAt, end),
          ne(invoices.status, "void"),
        ),
      )
      .groupBy(members.fullName)
      .orderBy(desc(sql`sum(${invoices.total})`))
      .limit(10),
  ]);

  const currency = clinic.currency;
  const revenue = totals?.revenue ?? 0;
  const invoiceCount = totals?.count ?? 0;
  const average = invoiceCount > 0 ? Math.round(revenue / invoiceCount) : 0;
  const discountGiven = totals?.discount ?? 0;
  const collected = totals?.collected ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="text-muted-foreground text-sm">
            Last {days} days, excluding voided invoices
          </p>
        </div>
        <RangePicker value={key} />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Revenue"
          value={formatMoney(revenue, currency)}
          meta={`${invoiceCount} ${invoiceCount === 1 ? "invoice" : "invoices"}`}
          chart={<Sparkline points={daily.map((d) => d.total)} />}
        />
        <StatTile
          label="Collected"
          value={formatMoney(collected, currency)}
          meta={
            revenue > 0
              ? `${Math.round((collected / revenue) * 100)}% of billed`
              : "Nothing billed"
          }
          tone="positive"
        />
        <StatTile
          label="Discounts given"
          value={formatMoney(discountGiven, currency)}
          meta={
            // Measured against list price — what the treatments would have
            // fetched undiscounted — rather than against the discounted total.
            discountGiven > 0
              ? `${Math.round((discountGiven / (revenue + discountGiven)) * 100)}% off list`
              : "None"
          }
          tone={discountGiven > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Average invoice"
          value={formatMoney(average, currency)}
          meta="Per patient visit"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top treatments" note="By revenue">
          {topServices.length === 0 ? (
            <Empty>Nothing billed in this period.</Empty>
          ) : (
            <ul className="divide-y">
              {topServices.map((service) => {
                const share =
                  (service.revenue / (topServices[0].revenue || 1)) * 100;
                return (
                  <li key={service.name} className="px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm">{service.name}</span>
                      <span className="text-sm tabular-nums">
                        {formatMoneyCompact(service.revenue, currency)}
                        <span className="text-muted-foreground ml-1.5 text-xs">
                          ×{service.quantity}
                        </span>
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
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="How patients paid" note="Payments received">
            {byMethod.length === 0 ? (
              <Empty>No payments in this period.</Empty>
            ) : (
              <ul className="divide-y">
                {byMethod.map((row) => (
                  <li
                    key={row.method}
                    className="flex items-baseline justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="text-sm capitalize">
                      {row.method.replace("_", " ")}
                    </span>
                    <span className="text-sm tabular-nums">
                      {formatMoney(row.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Billed by" note="Who raised the invoice">
            {byStaff.length === 0 ? (
              <Empty>No invoices in this period.</Empty>
            ) : (
              <ul className="divide-y">
                {byStaff.map((row) => (
                  <li
                    key={row.name}
                    className="flex items-baseline justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="truncate text-sm">{row.name}</span>
                    <span className="text-sm tabular-nums">
                      {formatMoney(row.revenue, currency)}
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        ×{row.count}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-lg border">
      <header className="border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-muted-foreground text-xs">{note}</p>
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-4 py-10 text-center text-sm">
      {children}
    </p>
  );
}
