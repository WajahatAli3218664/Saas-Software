import { CreateOrganization } from "@clerk/nextjs";
import { Stethoscope } from "lucide-react";

export const metadata = { title: "Set up your clinic" };

export default function OnboardingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
          <Stethoscope className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-balance">
          Set up your clinic
        </h1>
        <p className="text-muted-foreground text-sm">
          Name it and add your logo. We will fill your catalogue with the
          treatments most clinics offer, ready to edit.
        </p>
      </div>

      <CreateOrganization
        skipInvitationScreen
        afterCreateOrganizationUrl="/dashboard"
        appearance={{ elements: { rootBox: "w-full max-w-md" } }}
      />
    </div>
  );
}
