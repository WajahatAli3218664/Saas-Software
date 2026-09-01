"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPatient, updatePatient } from "./actions";

export interface PatientFormValues {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  gender: "male" | "female" | "other" | null;
  dateOfBirth: Date | null;
  city: string | null;
  addressLine: string | null;
  allergies: string | null;
  notes: string | null;
}

export function PatientDialog({ patient }: { patient?: PatientFormValues }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const isEdit = Boolean(patient);

  function onSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result = isEdit
        ? await updatePatient(patient!.id, formData)
        : await createPatient(formData);

      if (result.ok) {
        toast.success(isEdit ? "Patient updated" : "Patient added");
        setOpen(false);
        return;
      }

      if (result.fieldErrors) setErrors(result.fieldErrors);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Add patient
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit patient" : "Add a patient"}
            </DialogTitle>
            <DialogDescription>
              Only the name is required — the rest can be filled in later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={patient?.fullName}
                autoFocus
                required
              />
              {errors.fullName && (
                <p className="text-destructive text-xs">{errors.fullName}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={patient?.phone ?? ""}
                  placeholder="0300 1234567"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={patient?.email ?? ""}
                />
                {errors.email && (
                  <p className="text-destructive text-xs">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  name="gender"
                  defaultValue={patient?.gender ?? "none"}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Not recorded" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not recorded</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={
                    patient?.dateOfBirth
                      ? patient.dateOfBirth.toISOString().slice(0, 10)
                      : ""
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={patient?.city ?? ""}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="addressLine">Address</Label>
                <Input
                  id="addressLine"
                  name="addressLine"
                  defaultValue={patient?.addressLine ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                name="allergies"
                defaultValue={patient?.allergies ?? ""}
                placeholder="Anything the practitioner must know"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                defaultValue={patient?.notes ?? ""}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
