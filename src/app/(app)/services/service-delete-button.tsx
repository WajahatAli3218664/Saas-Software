"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteService } from "./actions";

export function ServiceDeleteButton({
  serviceId,
  name,
}: {
  serviceId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive size-8"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden />
        <span className="sr-only">Delete {name}</span>
      </Button>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            It comes off the price list for good. Past invoices and
            appointments that used it keep their own record, so nothing already
            billed changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await deleteService(serviceId);
                if (!result.ok) {
                  toast.error(result.error ?? "Could not delete that service.");
                  return;
                }
                toast.success(`${name} deleted`);
                setOpen(false);
              });
            }}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
