import Link from "next/link";
import { Users } from "lucide-react";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getPatients } from "@/lib/queries";
import { PatientDialog } from "./patient-dialog";
import { PatientSearch } from "./patient-search";

// Every render here depends on the signed-in tenant and must never
// be cached or shared across requests.
export const dynamic = "force-dynamic";

export const metadata = { title: "Patients" };

export default async function PatientsPage({
  searchParams,
}: PageProps<"/patients">) {
  const { clinic, member } = await requireTenantSession();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";

  const rows = await getPatients(clinic.id, query);
  const canCreate = can(member, "patient:create");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Patients
          </h1>
          <p className="text-muted-foreground text-sm">
            {query
              ? `${rows.length} matching “${query}”`
              : `${rows.length} on record`}
          </p>
        </div>
        {canCreate && <PatientDialog />}
      </header>

      <PatientSearch defaultValue={query} />

      {rows.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-lg border px-6 py-16 text-center">
          <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="font-medium">
            {query ? "No patients match that search" : "No patients yet"}
          </p>
          <p className="text-muted-foreground max-w-sm text-sm">
            {query
              ? "Try a name, phone number or patient code."
              : "Add a patient and their treatment history builds itself as you bill them."}
          </p>
        </div>
      ) : (
        <div className="bg-card overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-xs uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Patient</th>
                <th className="px-4 py-2.5 text-left font-medium">Phone</th>
                <th className="px-4 py-2.5 text-left font-medium">City</th>
                <th className="px-4 py-2.5 text-left font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-muted/40 border-b last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="font-medium hover:underline"
                    >
                      {patient.fullName}
                    </Link>
                    <div className="text-muted-foreground font-mono text-xs">
                      {patient.code}
                    </div>
                    {patient.allergies && (
                      <div className="text-destructive mt-0.5 text-xs">
                        Allergies: {patient.allergies}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {patient.phone ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {patient.city ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5">
                    {patient.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: clinic.timezone,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
