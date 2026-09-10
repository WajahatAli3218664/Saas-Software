"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Plus, Printer, Trash2 } from "lucide-react";
import type { PrintTemplate } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  createPrintTemplate,
  deletePrintTemplate,
  setDefaultPrintTemplate,
  updatePrintTemplate,
  PAPER_SIZES,
} from "./actions";

type PaperSize = (typeof PAPER_SIZES)[number]["value"];

function paperLabel(value: string) {
  return PAPER_SIZES.find((p) => p.value === value)?.label ?? value;
}

/** The form body, shared by the "add" and "edit" dialogs. */
function TemplateFields({
  template,
  errors,
}: {
  template?: PrintTemplate;
  errors: Record<string, string>;
}) {
  const [paperSize, setPaperSize] = useState<PaperSize>(
    (template?.paperSize as PaperSize) ?? "a4",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">What is this printer called?</Label>
        <Input
          id="name"
          name="name"
          defaultValue={template?.name ?? ""}
          placeholder="Front desk receipt printer"
          required
        />
        <p className="text-muted-foreground text-xs">
          A name your staff will recognise, like &ldquo;Front desk&rdquo; or
          &ldquo;Doctor&rsquo;s room&rdquo;.
        </p>
        {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label>Paper size</Label>
        {/* Radio cards rather than a select: the hint under each option is
            the part that actually helps someone pick the right one. */}
        <input type="hidden" name="paperSize" value={paperSize} />
        <div className="grid gap-2 sm:grid-cols-2">
          {PAPER_SIZES.map((size) => {
            const active = paperSize === size.value;
            return (
              <button
                key={size.value}
                type="button"
                onClick={() => setPaperSize(size.value)}
                aria-pressed={active}
                className={`rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-primary bg-primary/5 ring-primary/20 ring-2"
                    : "hover:border-muted-foreground/30"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {size.label}
                  {active && <Check className="text-primary size-3.5" aria-hidden />}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {size.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">
            Show the clinic logo
            <span className="text-muted-foreground block text-xs">
              Thermal printers often look cleaner without it.
            </span>
          </span>
          <Switch name="showLogo" defaultChecked={template?.showLogo ?? true} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">
            Show the tax line
            <span className="text-muted-foreground block text-xs">
              Turn off for a plain receipt with no tax breakdown.
            </span>
          </span>
          <Switch name="showTax" defaultChecked={template?.showTax ?? true} />
        </label>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="headerText">Line above the invoice (optional)</Label>
        <Input
          id="headerText"
          name="headerText"
          defaultValue={template?.headerText ?? ""}
          placeholder="Thank you for visiting"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="footerText">Line at the bottom (optional)</Label>
        <Textarea
          id="footerText"
          name="footerText"
          rows={2}
          defaultValue={template?.footerText ?? ""}
          placeholder="Follow-up appointments can be booked at the front desk."
        />
      </div>
    </div>
  );
}

function AddPrinterDialog({ canAddMore }: { canAddMore: boolean }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result = await createPrintTemplate(formData);
      if (result.ok) {
        toast.success("Printer added");
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
        <Button size="sm" disabled={!canAddMore}>
          <Plus className="size-4" aria-hidden />
          Add a printer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a printer</DialogTitle>
          <DialogDescription>
            Set up how invoices should look on this printer. You can switch
            between printers when you print an invoice.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="flex flex-col gap-4">
          <TemplateFields errors={errors} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add printer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPrinterDialog({ template }: { template: PrintTemplate }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result = await updatePrintTemplate(template.id, formData);
      if (result.ok) {
        toast.success("Printer saved");
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
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {template.name}</DialogTitle>
          <DialogDescription>
            Changes apply the next time someone prints with this printer.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="flex flex-col gap-4">
          <TemplateFields template={template} errors={errors} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePrinterButton({ template }: { template: PrintTemplate }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await deletePrintTemplate(template.id);
      if (result.ok) {
        toast.success("Printer removed");
        setOpen(false);
        return;
      }
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${template.name}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {template.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Invoices you have already printed are not affected. This only
            removes the printer from the list.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DefaultButton({ template }: { template: PrintTemplate }) {
  const [pending, startTransition] = useTransition();

  if (template.isDefault) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Check className="size-3" aria-hidden />
        Default
      </Badge>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setDefaultPrintTemplate(template.id);
          if (result.ok) toast.success(`${template.name} is now the default`);
          else if (result.error) toast.error(result.error);
        })
      }
    >
      Make default
    </Button>
  );
}

export function PrinterManager({
  templates,
  allowed,
}: {
  templates: PrintTemplate[];
  /** -1 means unlimited. */
  allowed: number;
}) {
  const canAddMore = allowed === -1 || templates.length < allowed;

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Printers</h2>
            <p className="text-muted-foreground text-sm">
              Set up each printer once. When you print an invoice you pick which
              one to use.
            </p>
          </div>
          <AddPrinterDialog canAddMore={canAddMore} />
        </div>

        {!canAddMore && (
          <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
            Your plan covers {allowed} {allowed === 1 ? "printer" : "printers"}.
            Upgrade your plan to set up more.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {templates.map((template) => (
            <li
              key={template.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <Printer
                className="text-muted-foreground size-5 shrink-0"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{template.name}</p>
                <p className="text-muted-foreground text-xs">
                  {paperLabel(template.paperSize)}
                  {!template.showLogo && " · no logo"}
                  {!template.showTax && " · no tax line"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <DefaultButton template={template} />
                <EditPrinterDialog template={template} />
                {templates.length > 1 && (
                  <DeletePrinterButton template={template} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
