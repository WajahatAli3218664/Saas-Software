import "server-only";
import { and, eq, gte, lte, desc, sql, count, sum, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  patients,
  services,
  serviceCategories,
  appointments,
  payments,
  members,
} from "@/db/schema";

/** Day boundaries in the clinic's timezone, expressed as UTC instants. */
export function dayRange(timezone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const local = `${get("year")}-${get("month")}-${get("day")}`;

  // Offset of the clinic's timezone at this instant, so "midnight there" can be
  // converted to the UTC instant the database stores.
  const asUtc = new Date(`${local}T00:00:00Z`);
  const shifted = new Date(
    date.toLocaleString("en-US", { timeZone: timezone }),
  );
  const offsetMs = date.getTime() - shifted.getTime();

  const start = new Date(asUtc.getTime() + offsetMs);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

export interface DashboardStats {
  todayRevenue: number;
  todayInvoices: number;
  todayPatients: number;
  outstandingAmount: number;
  outstandingCount: number;
  monthRevenue: number;
  totalPatients: number;
  activeServices: number;
}

export async function getDashboardStats(
  clinicId: string,
  timezone: string,
): Promise<DashboardStats> {
  const { start, end } = dayRange(timezone);
  const monthStart = new Date(start);
  monthStart.setUTCDate(1);

  const [today] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
      invoiceCount: count(invoices.id),
      patientCount: sql<number>`count(distinct ${invoices.patientId})::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clinicId, clinicId),
        gte(invoices.issuedAt, start),
        lte(invoices.issuedAt, end),
        ne(invoices.status, "void"),
      ),
    );

  // Outstanding is the unpaid remainder, not the invoice total — a partially
  // paid bill should only show what is still owed.
  const [outstanding] = await db
    .select({
      amount: sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)::int`,
      invoiceCount: count(invoices.id),
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clinicId, clinicId),
        sql`${invoices.status} in ('unpaid', 'partial')`,
      ),
    );

  const [month] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clinicId, clinicId),
        gte(invoices.issuedAt, monthStart),
        ne(invoices.status, "void"),
      ),
    );

  const [patientTotal] = await db
    .select({ value: count() })
    .from(patients)
    .where(and(eq(patients.clinicId, clinicId), eq(patients.isActive, true)));

  const [serviceTotal] = await db
    .select({ value: count() })
    .from(services)
    .where(and(eq(services.clinicId, clinicId), eq(services.isActive, true)));

  return {
    todayRevenue: today?.revenue ?? 0,
    todayInvoices: today?.invoiceCount ?? 0,
    todayPatients: today?.patientCount ?? 0,
    outstandingAmount: outstanding?.amount ?? 0,
    outstandingCount: outstanding?.invoiceCount ?? 0,
    monthRevenue: month?.revenue ?? 0,
    totalPatients: patientTotal?.value ?? 0,
    activeServices: serviceTotal?.value ?? 0,
  };
}

/** Daily takings for the last n days, oldest first — feeds the sparkline. */
export async function getRevenueTrend(
  clinicId: string,
  timezone: string,
  days = 14,
): Promise<Array<{ date: string; total: number }>> {
  const { end } = dayRange(timezone);
  const from = new Date(end.getTime() - days * 86_400_000);

  const rows = await db
    .select({
      date: sql<string>`to_char(${invoices.issuedAt} at time zone ${timezone}, 'YYYY-MM-DD')`,
      total: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clinicId, clinicId),
        gte(invoices.issuedAt, from),
        ne(invoices.status, "void"),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  // Fill the gaps so a quiet day is a zero on the chart, not a missing point.
  const byDate = new Map(rows.map((r) => [r.date, r.total]));
  const out: Array<{ date: string; total: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - (i + 1) * 86_400_000);
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    out.push({ date: key, total: byDate.get(key) ?? 0 });
  }
  return out;
}

export async function getRecentInvoices(clinicId: string, limit = 8) {
  return db
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
    .where(eq(invoices.clinicId, clinicId))
    .orderBy(desc(invoices.issuedAt))
    .limit(limit);
}

export async function getTopServices(
  clinicId: string,
  timezone: string,
  limit = 5,
) {
  const { end } = dayRange(timezone);
  const from = new Date(end.getTime() - 30 * 86_400_000);

  return db
    .select({
      name: invoiceItems.name,
      revenue: sql<number>`coalesce(sum(${invoiceItems.lineTotal}), 0)::int`,
      quantity: sql<number>`coalesce(sum(${invoiceItems.quantity}), 0)::int`,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .where(
      and(
        eq(invoiceItems.clinicId, clinicId),
        gte(invoices.issuedAt, from),
        ne(invoices.status, "void"),
      ),
    )
    .groupBy(invoiceItems.name)
    .orderBy(desc(sql`sum(${invoiceItems.lineTotal})`))
    .limit(limit);
}

export async function getServicesWithCategories(clinicId: string) {
  return db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      price: services.price,
      durationMinutes: services.durationMinutes,
      maxDiscountPercent: services.maxDiscountPercent,
      isActive: services.isActive,
      categoryId: services.categoryId,
      categoryName: serviceCategories.name,
      categoryColor: serviceCategories.colorHex,
    })
    .from(services)
    .leftJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .where(eq(services.clinicId, clinicId))
    .orderBy(serviceCategories.sortOrder, services.name);
}

export async function getCategories(clinicId: string) {
  return db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.clinicId, clinicId))
    .orderBy(serviceCategories.sortOrder, serviceCategories.name);
}

export async function getPatients(clinicId: string, search?: string) {
  const filters = [eq(patients.clinicId, clinicId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    filters.push(
      sql`(${patients.fullName} ilike ${term} or ${patients.phone} ilike ${term} or ${patients.code} ilike ${term})`,
    );
  }

  return db
    .select()
    .from(patients)
    .where(and(...filters))
    .orderBy(desc(patients.createdAt))
    .limit(200);
}

export async function getStaff(clinicId: string) {
  return db
    .select()
    .from(members)
    .where(eq(members.clinicId, clinicId))
    .orderBy(members.role, members.fullName);
}
