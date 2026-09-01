import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getStaff } from "@/lib/queries";
import { StaffRow } from "./staff-row";

export const metadata = { title: "Staff & access" };

export default async function StaffSettingsPage() {
  const { clinic, member } = await requireTenantSession();

  if (!can(member, "staff:manage")) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        You do not have permission to manage staff.
      </p>
    );
  }

  const staff = await getStaff(clinic.id);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Invite people from the account menu. Once they have joined, set exactly
        what each person may do here.
      </p>

      <div className="bg-card rounded-lg border">
        {staff.map((person) => (
          <StaffRow
            key={person.id}
            member={person}
            isSelf={person.id === member.id}
            editable={person.role !== "owner" || person.id === member.id}
          />
        ))}
      </div>
    </div>
  );
}
