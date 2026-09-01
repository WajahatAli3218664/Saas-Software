"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  computeInvoiceTotals,
  formatMoney,
  minorUnitFactor,
  parseMoney,
  type DiscountType,
} from "@/lib/money";
import { createInvoice } from "../actions";
import { cn } from "@/lib/utils";

export interface CatalogueService {
  id: string;
  name: string;
  price: number;
  categoryName: string | null;
  maxDiscountPercent: string;
}

export interface PatientOption {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
}

interface Line {
  key: string;
  serviceId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discountType: DiscountType | null;
  discountValue: number;
  maxDiscountPercent: number;
}

export function InvoiceBuilder({
  catalogue,
  patients,
  currency,
  taxPercent,
  taxLabel,
  maxDiscount,
  canDiscount,
}: {
  catalogue: CatalogueService[];
  patients: PatientOption[];
  currency: string;
  taxPercent: number;
  taxLabel: string | null;
  maxDiscount: number;
  canDiscount: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [patientId, setPatientId] = useState<string>("walk-in");
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [invoiceDiscountType, setInvoiceDiscountType] =
    useState<DiscountType>("percent");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState("");
  const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState("");
  const [method, setMethod] = useState("cash");

  const factor = minorUnitFactor(currency);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalogue.slice(0, 8);
    return catalogue
      .filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.categoryName?.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [catalogue, search]);

  const totals = useMemo(
    () =>
      computeInvoiceTotals({
        lines: lines.map((l) => ({
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
        invoiceDiscountType: canDiscount ? invoiceDiscountType : null,
        invoiceDiscountValue: canDiscount
          ? discountInMinor(invoiceDiscountValue, invoiceDiscountType, factor)
          : 0,
        taxPercent,
      }),
    [
      lines,
      invoiceDiscountType,
      invoiceDiscountValue,
      taxPercent,
      canDiscount,
      factor,
    ],
  );

  function addService(service: CatalogueService) {
    setLines((current) => {
      // Adding the same treatment twice bumps the quantity rather than
      // stacking two identical rows.
      const existing = current.find((l) => l.serviceId === service.id);
      if (existing) {
        return current.map((l) =>
          l.serviceId === service.id
            ? { ...l, quantity: Math.min(l.quantity + 1, 99) }
            : l,
        );
      }
      return [
        ...current,
        {
          key: `${service.id}-${Date.now()}`,
          serviceId: service.id,
          name: service.name,
          unitPrice: service.price,
          quantity: 1,
          discountType: null,
          discountValue: 0,
          maxDiscountPercent: Number(service.maxDiscountPercent),
        },
      ];
    });
    setSearch("");
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((l) => l.key !== key));
  }

  function submit() {
    if (lines.length === 0) {
      toast.error("Add at least one treatment.");
      return;
    }

    // Mirrors the server's own check, so a discount past the cap never
    // reaches the network call — the badge already flagged the offending
    // line, this just stops the click from doing anything.
    const blocked = lines.find((line) => {
      if (!line.discountType || line.discountValue <= 0) return false;
      const percent = discountAsPercent(line);
      return percent > Math.min(line.maxDiscountPercent, maxDiscount);
    });
    if (blocked) {
      toast.error(
        `${blocked.name}'s discount is too large — fix it before continuing.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await createInvoice({
        patientId: patientId === "walk-in" ? null : patientId,
        lines: lines.map((l) => ({
          serviceId: l.serviceId,
          quantity: l.quantity,
          discountType: l.discountType,
          discountValue: l.discountValue,
        })),
        discountType: canDiscount ? invoiceDiscountType : null,
        discountValue: canDiscount
          ? discountInMinor(invoiceDiscountValue, invoiceDiscountType, factor)
          : 0,
        notes: notes.trim() || null,
        payNow: parseMoney(payNow || "0", currency) ?? 0,
        paymentMethod: method,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Could not create the invoice.");
        return;
      }

      toast.success("Invoice created");
      router.push(`/billing/${result.invoiceId}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* Patient */}
        <section className="bg-card rounded-lg border p-4">
          <Label htmlFor="patient" className="mb-1.5">
            Patient
          </Label>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger id="patient" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in (no record)</SelectItem>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.fullName} · {patient.code}
                  {patient.phone ? ` · ${patient.phone}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* Treatment picker */}
        <section className="bg-card rounded-lg border">
          <div className="border-b p-4">
            <Label htmlFor="service-search" className="mb-1.5">
              Add a treatment
            </Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="service-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your price list…"
                className="pl-8"
                autoComplete="off"
              />
            </div>

            {filtered.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {filtered.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => addService(service)}
                    className="hover:border-primary hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Plus className="size-3" aria-hidden />
                    {service.name}
                    <span className="text-muted-foreground tabular-nums">
                      {formatMoney(service.price, currency)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          {lines.length === 0 ? (
            <p className="text-muted-foreground px-4 py-10 text-center text-sm">
              No treatments added yet.
            </p>
          ) : (
            <div className="divide-y">
              {lines.map((line, index) => {
                const computed = totals.lines[index];
                const overCap =
                  line.discountType && line.discountValue > 0
                    ? discountAsPercent(line) >
                      Math.min(line.maxDiscountPercent, maxDiscount)
                    : false;

                return (
                  <div key={line.key} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{line.name}</p>
                        <p className="text-muted-foreground text-xs tabular-nums">
                          {formatMoney(line.unitPrice, currency)} each
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Remove ${line.name}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[5rem_1fr_1fr_auto] sm:items-end">
                      <div className="grid gap-1">
                        <Label
                          htmlFor={`qty-${line.key}`}
                          className="text-xs"
                        >
                          Qty
                        </Label>
                        <Input
                          id={`qty-${line.key}`}
                          type="number"
                          min={1}
                          max={99}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, {
                              quantity: Math.max(
                                1,
                                Math.min(99, Number(e.target.value) || 1),
                              ),
                            })
                          }
                          className="tabular-nums"
                        />
                      </div>

                      {canDiscount ? (
                        <>
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`dtype-${line.key}`}
                              className="text-xs"
                            >
                              Discount
                              <span className="text-muted-foreground ml-1 font-normal normal-case">
                                (up to{" "}
                                {Math.min(line.maxDiscountPercent, maxDiscount)}
                                %)
                              </span>
                            </Label>
                            <Select
                              value={line.discountType ?? "none"}
                              onValueChange={(value) =>
                                updateLine(line.key, {
                                  discountType:
                                    value === "none"
                                      ? null
                                      : (value as DiscountType),
                                  discountValue:
                                    value === "none" ? 0 : line.discountValue,
                                })
                              }
                            >
                              <SelectTrigger id={`dtype-${line.key}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="percent">Percent</SelectItem>
                                <SelectItem value="fixed">Amount</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-1">
                            <Label
                              htmlFor={`dval-${line.key}`}
                              className="text-xs"
                            >
                              {line.discountType === "fixed"
                                ? "Amount off"
                                : "Percent off"}
                            </Label>
                            <Input
                              id={`dval-${line.key}`}
                              inputMode="decimal"
                              disabled={!line.discountType}
                              value={
                                line.discountType === "fixed"
                                  ? line.discountValue
                                    ? String(line.discountValue / factor)
                                    : ""
                                  : line.discountValue || ""
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                const numeric = Number(
                                  raw.replace(/[^0-9.]/g, ""),
                                );
                                updateLine(line.key, {
                                  discountValue: Number.isFinite(numeric)
                                    ? line.discountType === "fixed"
                                      ? Math.round(numeric * factor)
                                      : numeric
                                    : 0,
                                });
                              }}
                              className={cn(
                                "tabular-nums",
                                overCap && "border-destructive",
                              )}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground text-xs sm:col-span-2">
                          Discounts are not available on your account.
                        </div>
                      )}

                      <div className="text-right font-medium tabular-nums sm:pb-2">
                        {formatMoney(computed.lineTotal, currency)}
                      </div>
                    </div>

                    {overCap && (
                      <p className="text-destructive text-xs">
                        Too large — this treatment allows at most{" "}
                        {Math.min(line.maxDiscountPercent, maxDiscount)}%.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-card rounded-lg border p-4">
          <Label htmlFor="notes" className="mb-1.5">
            Notes on the invoice (optional)
          </Label>
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything that should be printed on the receipt"
          />
        </section>
      </div>

      {/* Summary */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <section className="bg-card rounded-lg border p-4">
          <h2 className="mb-3 font-medium">Summary</h2>

          <dl className="flex flex-col gap-1.5 text-sm">
            <Row
              label="Subtotal"
              value={formatMoney(totals.subtotal, currency)}
            />
            {totals.lineDiscountTotal > 0 && (
              <Row
                label="Line discounts"
                value={`−${formatMoney(totals.lineDiscountTotal, currency)}`}
                tone="success"
              />
            )}

            {canDiscount && (
              <div className="grid grid-cols-[1fr_auto] items-center gap-2 py-1">
                <Select
                  value={invoiceDiscountType}
                  onValueChange={(v) =>
                    setInvoiceDiscountType(v as DiscountType)
                  }
                >
                  <SelectTrigger size="sm" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Discount %</SelectItem>
                    <SelectItem value="fixed">Discount amount</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  inputMode="decimal"
                  value={invoiceDiscountValue}
                  onChange={(e) => setInvoiceDiscountValue(e.target.value)}
                  placeholder="0"
                  className="h-8 w-20 text-right tabular-nums"
                  aria-label="Invoice discount"
                />
              </div>
            )}

            {totals.invoiceDiscountAmount > 0 && (
              <Row
                label="Invoice discount"
                value={`−${formatMoney(totals.invoiceDiscountAmount, currency)}`}
                tone="success"
              />
            )}

            {taxPercent > 0 && (
              <Row
                label={`${taxLabel ?? "Tax"} (${taxPercent}%)`}
                value={formatMoney(totals.taxAmount, currency)}
              />
            )}

            <div className="mt-1.5 flex items-baseline justify-between border-t pt-2.5">
              <dt className="font-medium">Total</dt>
              <dd className="font-display text-xl font-semibold tabular-nums">
                {formatMoney(totals.total, currency)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-card flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="font-medium">Payment</h2>

          <div className="grid gap-1.5">
            <Label htmlFor="payNow">Paying now</Label>
            <Input
              id="payNow"
              inputMode="decimal"
              value={payNow}
              onChange={(e) => setPayNow(e.target.value)}
              placeholder="0"
              className="tabular-nums"
            />
            <button
              type="button"
              onClick={() => setPayNow(String(totals.total / factor))}
              className="text-primary self-start text-xs hover:underline"
            >
              Pay in full
            </button>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="method">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={submit}
            disabled={pending || lines.length === 0}
            className="mt-1 w-full"
          >
            {pending ? "Creating…" : "Create invoice"}
          </Button>
        </section>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn("tabular-nums", tone === "success" && "text-success")}
      >
        {value}
      </dd>
    </div>
  );
}

function discountInMinor(
  raw: string,
  type: DiscountType,
  factor: number,
): number {
  const numeric = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return type === "fixed" ? Math.round(numeric * factor) : numeric;
}

function discountAsPercent(line: Line): number {
  const gross = line.unitPrice * line.quantity;
  if (line.discountType === "percent") return line.discountValue;
  return gross > 0 ? (line.discountValue / gross) * 100 : 0;
}
