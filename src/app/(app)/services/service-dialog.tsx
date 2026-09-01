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
import { createService, updateService, type ActionResult } from "./actions";

export interface ServiceFormValues {
  id?: string;
  name: string;
  categoryId: string | null;
  description: string | null;
  price: number;
  durationMinutes: number;
  maxDiscountPercent: string;
}

export function ServiceDialog({
  categories,
  currency,
  currencySymbol,
  canEditPrice,
  service,
}: {
  categories: Array<{ id: string; name: string }>;
  currency: string;
  currencySymbol: string;
  canEditPrice: boolean;
  service?: ServiceFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const isEdit = Boolean(service?.id);
  const factor = currency === "PKR" || currency === "USD" ? 100 : 100;

  function onSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result: ActionResult = isEdit
        ? await updateService(service!.id!, formData)
        : await createService(formData);

      if (result.ok) {
        toast.success(isEdit ? "Service updated" : "Service added");
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
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-3.5" aria-hidden />
            <span className="sr-only">Edit {service?.name}</span>
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" aria-hidden />
            Add service
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit service" : "Add a service"}
            </DialogTitle>
            <DialogDescription>
              This appears on the billing screen and on printed invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={service?.name}
                placeholder="HydraFacial"
                autoFocus
                required
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                name="categoryId"
                defaultValue={service?.categoryId ?? "none"}
              >
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Uncategorised" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorised</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="price">Price ({currencySymbol})</Label>
                <Input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  defaultValue={
                    service ? (service.price / factor).toString() : ""
                  }
                  placeholder="0"
                  disabled={isEdit && !canEditPrice}
                  className="tabular-nums"
                />
                {isEdit && !canEditPrice && (
                  <p className="text-muted-foreground text-xs">
                    You cannot change prices.
                  </p>
                )}
                {errors.price && <FieldError>{errors.price}</FieldError>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={0}
                  max={600}
                  step={5}
                  defaultValue={service?.durationMinutes ?? 30}
                  className="tabular-nums"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="maxDiscountPercent">
                Largest discount allowed (%)
              </Label>
              <Input
                id="maxDiscountPercent"
                name="maxDiscountPercent"
                type="number"
                min={0}
                max={100}
                step={1}
                defaultValue={service?.maxDiscountPercent ?? "100"}
                className="tabular-nums"
              />
              <p className="text-muted-foreground text-xs">
                Caps this treatment however much discount the operator is
                otherwise allowed.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Notes (optional)</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={service?.description ?? ""}
                placeholder="Anything the front desk should know"
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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-destructive text-xs">{children}</p>;
}
