"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createAppointment } from "./actions";

export function NewAppointmentDialog({
  patients,
  staff,
  date,
}: {
  patients: Array<{
    id: string;
    code: string;
    fullName: string;
    phone: string | null;
  }>;
  staff: Array<{ id: string; fullName: string }>;
  date: string;
}) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [practitionerId, setPractitionerId] = useState("none");
  const [day, setDay] = useState(date);
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!patientId) {
      toast.error("Choose a patient.");
      return;
    }

    startTransition(async () => {
      const result = await createAppointment({
        patientId,
        practitionerId: practitionerId === "none" ? null : practitionerId,
        // Sent as a local datetime string; the server reads it as an instant.
        startsAt: `${day}T${time}:00`,
        serviceIds: [],
        notes: notes.trim() || null,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Could not book that appointment.");
        return;
      }

      toast.success("Appointment booked");
      setOpen(false);
      setPatientId("");
      setNotes("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          Book appointment
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book an appointment</DialogTitle>
          <DialogDescription>
            The slot runs 30 minutes unless treatments are added to it later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="appt-patient">Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger id="appt-patient">
                <SelectValue placeholder="Choose a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.fullName} · {patient.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="appt-date">Date</Label>
              <Input
                id="appt-date"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="appt-time">Time</Label>
              <Input
                id="appt-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step={300}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="appt-practitioner">With</Label>
            <Select value={practitionerId} onValueChange={setPractitionerId}>
              <SelectTrigger id="appt-practitioner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Anyone</SelectItem>
                {staff.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="appt-notes">Notes</Label>
            <Textarea
              id="appt-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the practitioner should know"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Booking…" : "Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
