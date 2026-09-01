import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  appointmentServices,
  patients,
  members,
} from "@/db/schema";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { dayRange } from "@/lib/queries";
import { AppointmentStatusBadge } from "@/components/app/status-badge";
import { AppointmentStatusMenu } from "./status-menu";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Appointments" };

/** yyyy-mm-dd for a date, shifted by n days, in the clinic's timezone. */
function isoDay(base: Date, offsetDays: number, timezone: string): string {
  const shifted = new Date(base.getTime() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

export default async function AppointmentsPage({
  searchParams,
}: PageProps<"/appointments">) {
  const { clinic, member } = await requireTenantSession();
  const params = await searchParams;

  const requested = typeof params.date === "string" ? params.date : null;
  // Parsed as clinic-local midnight so "today" means today at the clinic.
  const anchor = requested ? new Date(`${requested}T12:00:00Z`) : new Date();
  const { start, end } = dayRange(clinic.timezone, anchor);

  const [rows, staff, patientList] = await Promise.all([
    db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
        notes: appointments.notes,
        patientId: patients.id,
        patientName: patients.fullName,
        patientCode: patients.code,
        patientPhone: patients.phone,
        practitionerName: members.fullName,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(members, eq(appointments.practitionerId, members.id))
      .where(
        and(
          eq(appointments.clinicId, clinic.id),
          gte(appointments.startsAt, start),
          lt(appointments.startsAt, end),
        ),
      )
      .orderBy(asc(appointments.startsAt)),

    db
      .select({ id: members.id, fullName: members.fullName })
      .from(members)
      .where(and(eq(members.clinicId, clinic.id), eq(members.isActive, true)))
      .orderBy(members.fullName),

    db
      .select({
        id: patients.id,
        code: patients.code,
        fullName: patients.fullName,
        phone: patients.phone,
      })
      .from(patients)
      .where(and(eq(patients.clinicId, clinic.id), eq(patients.isActive, true)))
      .orderBy(patients.fullName)
      .limit(500),
  ]);

  // Scoped to the day's appointments — selecting every treatment the clinic
  // has ever booked would grow without bound.
  const treatments = rows.length
    ? await db
        .select({
          appointmentId: appointmentServices.appointmentId,
          serviceName: appointmentServices.serviceName,
        })
        .from(appointmentServices)
        .where(
          and(
            eq(appointmentServices.clinicId, clinic.id),
            inArray(
              appointmentServices.appointmentId,
              rows.map((row) => row.id),
            ),
          ),
        )
    : [];

  const byAppointment = new Map<string, string[]>();
  for (const treatment of treatments) {
    const list = byAppointment.get(treatment.appointmentId) ?? [];
    list.push(treatment.serviceName);
    byAppointment.set(treatment.appointmentId, list);
  }

  const today = isoDay(new Date(), 0, clinic.timezone);
  const viewing = isoDay(anchor, 0, clinic.timezone);
  const canManage = can(member, "appointment:manage");

  const heading = new Date(`${viewing}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Appointments
          </h1>
          <p className="text-muted-foreground text-sm">
            {heading}
            {viewing === today && " · today"}
          </p>
        </div>

        {canManage && (
          <NewAppointmentDialog
            patients={patientList}
            staff={staff}
            date={viewing}
          />
        )}
      </header>

      <nav className="flex items-center gap-1" aria-label="Change day">
        <Button asChild variant="outline" size="icon" className="size-8">
          <Link
            href={`/appointments?date=${isoDay(anchor, -1, clinic.timezone)}`}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/appointments">Today</Link>
        </Button>
        <Button asChild variant="outline" size="icon" className="size-8">
          <Link
            href={`/appointments?date=${isoDay(anchor, 1, clinic.timezone)}`}
            aria-label="Next day"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </nav>

      {rows.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-lg border px-6 py-16 text-center">
          <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <p className="font-medium">Nothing booked</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            The day is clear. Book someone in and they will appear here in time
            order.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((appointment) => {
            const time = appointment.startsAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: clinic.timezone,
            });
            const until = appointment.endsAt.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: clinic.timezone,
            });
            const booked = byAppointment.get(appointment.id) ?? [];

            return (
              <li
                key={appointment.id}
                className="bg-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-4"
              >
                <div className="w-14 shrink-0">
                  <div className="font-medium tabular-nums">{time}</div>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {until}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {appointment.patientId ? (
                    <Link
                      href={`/patients/${appointment.patientId}`}
                      className="font-medium hover:underline"
                    >
                      {appointment.patientName}
                    </Link>
                  ) : (
                    <span className="font-medium">Unknown patient</span>
                  )}
                  <div className="text-muted-foreground truncate text-xs">
                    {booked.length > 0
                      ? booked.join(", ")
                      : "No treatment recorded"}
                    {appointment.practitionerName &&
                      ` · with ${appointment.practitionerName}`}
                  </div>
                </div>

                {canManage ? (
                  <AppointmentStatusMenu
                    appointmentId={appointment.id}
                    status={appointment.status}
                  />
                ) : (
                  <AppointmentStatusBadge status={appointment.status} />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
