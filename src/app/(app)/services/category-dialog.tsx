"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
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
import { createCategory } from "./actions";

/** A small, clinic-appropriate spread rather than a full colour picker. */
const SWATCHES = [
  "#0d9488",
  "#6366f1",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#9333ea",
  "#65a30d",
  "#64748b",
];

export function CategoryDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState(SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCategory(formData);
      if (result.ok) {
        toast.success(`${name} added`);
        setOpen(false);
        setName("");
        setColorHex(SWATCHES[0]);
        return;
      }
      setError(result.fieldErrors?.name ?? result.error ?? "Could not add that category.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderPlus className="size-4" aria-hidden />
          Add category
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add a category</DialogTitle>
            <DialogDescription>
              Groups related treatments on the price list, like
              &ldquo;Injectables&rdquo; or &ldquo;Skin Treatments&rdquo;.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Skin Treatments"
                autoFocus
                required
              />
              {error && <p className="text-destructive text-xs">{error}</p>}
            </div>

            <div className="grid gap-1.5">
              <Label>Colour</Label>
              <input type="hidden" name="colorHex" value={colorHex} />
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColorHex(swatch)}
                    aria-label={`Choose ${swatch}`}
                    aria-pressed={colorHex === swatch}
                    className="ring-offset-background size-7 rounded-full transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    style={{
                      backgroundColor: swatch,
                      boxShadow:
                        colorHex === swatch
                          ? `0 0 0 2px var(--background), 0 0 0 4px ${swatch}`
                          : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
