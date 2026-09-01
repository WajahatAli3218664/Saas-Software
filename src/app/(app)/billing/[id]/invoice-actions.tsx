"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Printer, Ban, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, minorUnitFactor, parseMoney } from "@/lib/money";
import { downloadInvoicePdf, sanitizeFilename } from "@/lib/download-invoice-pdf";
import { recordPayment, voidInvoice } from "../actions";

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  patientName,
  outstanding,
  currency,
  status,
  canRecordPayment,
  canVoid,
}: {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string | null;
  outstanding: number;
  currency: string;
  status: string;
  canRecordPayment: boolean;
  canVoid: boolean;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pending, startTransition] = useTransition();

  // "Print" saves a PDF directly rather than opening the OS print dialog —
  // Windows' "Microsoft Print to PDF" destination ignores the page title and
  // always prompts for a filename, so the dialog route can never reliably
  // name the file. This gets the invoice onto disk, correctly named, in one
  // click; from there the operator can open and print it normally if a
  // physical printer is what they actually wanted.
  async function handlePrint() {
    setDownloading(true);
    try {
      const filename = sanitizeFilename(
        patientName ? `${invoiceNumber} — ${patientName}` : invoiceNumber,
      );
      await downloadInvoicePdf(filename);
      toast.success("Saved to your downloads");
    } catch {
      toast.error("Could not create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const isVoid = status === "void";
  const settled = outstanding <= 0;
  const factor = minorUnitFactor(currency);

  function submitPayment() {
    const parsed = parseMoney(amount, currency);
    if (!parsed || parsed <= 0) {
      toast.error("Enter an amount.");
      return;
    }

    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        amount: parsed,
        method,
        reference: null,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Could not record that payment.");
        return;
      }

      toast.success("Payment recorded");
      setPayOpen(false);
      setAmount("");
    });
  }

  function submitVoid() {
    startTransition(async () => {
      const result = await voidInvoice(invoiceId, reason.trim() || "No reason given");
      if (!result.ok) {
        toast.error(result.error ?? "Could not void that invoice.");
        return;
      }
      toast.success(`${invoiceNumber} voided`);
      setVoidOpen(false);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={handlePrint} disabled={downloading}>
        {downloading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Printer className="size-4" aria-hidden />
        )}
        {downloading ? "Preparing…" : "Print"}
      </Button>

      {canRecordPayment && !isVoid && !settled && (
        <Button size="sm" onClick={() => setPayOpen(true)}>
          <Wallet className="size-4" aria-hidden />
          Record payment
        </Button>
      )}

      {canVoid && !isVoid && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setVoidOpen(true)}
        >
          <Ban className="size-4" aria-hidden />
          Void
        </Button>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              {formatMoney(outstanding, currency)} is still owed on{" "}
              {invoiceNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="tabular-nums"
              />
              <button
                type="button"
                onClick={() => setAmount(String(outstanding / factor))}
                className="text-primary self-start text-xs hover:underline"
              >
                Settle in full
              </button>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="pay-method">
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
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={pending}>
              {pending ? "Recording…" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void {invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice stays on record with its number, marked void. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="void-reason">Reason</Label>
            <Input
              id="void-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Billed in error"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submitVoid();
              }}
              disabled={pending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {pending ? "Voiding…" : "Void invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
