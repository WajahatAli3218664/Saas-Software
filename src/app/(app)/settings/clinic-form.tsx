"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Clinic } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClinic } from "./actions";

export function ClinicForm({ clinic }: { clinic: Clinic }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result = await updateClinic(formData);
      if (result.ok) {
        toast.success("Clinic details saved");
        return;
      }
      if (result.fieldErrors) setErrors(result.fieldErrors);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-6">
      <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-medium">Clinic details</h2>
        <p className="text-muted-foreground -mt-3 text-sm">
          These appear at the top of every invoice you print.
        </p>

        <div className="grid gap-1.5">
          <Label htmlFor="name">Clinic name</Label>
          <Input id="name" name="name" defaultValue={clinic.name} required />
          {errors.name && (
            <p className="text-destructive text-xs">{errors.name}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={clinic.phone ?? ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={clinic.email ?? ""}
            />
            {errors.email && (
              <p className="text-destructive text-xs">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="addressLine">Address</Label>
            <Input
              id="addressLine"
              name="addressLine"
              defaultValue={clinic.addressLine ?? ""}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={clinic.city ?? ""} />
          </div>
        </div>
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-medium">Invoicing</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="invoicePrefix">Invoice prefix</Label>
            <Input
              id="invoicePrefix"
              name="invoicePrefix"
              defaultValue={clinic.invoicePrefix}
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Numbers look like {clinic.invoicePrefix}-000042
            </p>
            {errors.invoicePrefix && (
              <p className="text-destructive text-xs">
                {errors.invoicePrefix}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="taxPercent">Tax rate (%)</Label>
            <Input
              id="taxPercent"
              name="taxPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              defaultValue={Number(clinic.taxPercent)}
              className="tabular-nums"
            />
            <p className="text-muted-foreground text-xs">
              Leave at 0 if you do not charge tax.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="taxLabel">Tax label</Label>
            <Input
              id="taxLabel"
              name="taxLabel"
              defaultValue={clinic.taxLabel ?? ""}
              placeholder="GST, VAT, Sales Tax…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="taxNumber">Registration number</Label>
            <Input
              id="taxNumber"
              name="taxNumber"
              defaultValue={clinic.taxNumber ?? ""}
              placeholder="NTN or VAT number"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="invoiceFooter">Footer note</Label>
          <Textarea
            id="invoiceFooter"
            name="invoiceFooter"
            rows={2}
            defaultValue={clinic.invoiceFooter ?? ""}
            placeholder="Thank you for visiting. Follow-up within 14 days is free."
          />
          <p className="text-muted-foreground text-xs">
            Printed at the bottom of every invoice.
          </p>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
