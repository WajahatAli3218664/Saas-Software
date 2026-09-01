"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  services,
  payments,
  auditLogs,
} from "@/db/schema";
import {
  requireActivePermission,
  SubscriptionLapsedError,
} from "@/lib/auth";
import { can, maxDiscountFor, PermissionError } from "@/lib/permissions";
import { computeInvoiceTotals, formatInvoiceNumber } from "@/lib/money";
import { nextInvoiceSequence } from "@/lib/tenant";

export interface ActionResult {
  ok: boolean;
  error?: string;
  invoiceId?: string;
}

function toResult(error: unknown): ActionResult {
  if (error instanceof PermissionError) {
    return { ok: false, error: "You do not have permission to do that." };
  }
  if (error instanceof SubscriptionLapsedError) {
    return {
      ok: false,
      error: "Your subscription is not active. Choose a plan to continue.",
    };
  }
  console.error("[billing-action]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const lineSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  discountType: z.enum(["percent", "fixed"]).nullable(),
  discountValue: z.number().min(0),
});

const invoiceSchema = z.object({
  patientId: z.string().uuid().nullable(),
  lines: z.array(lineSchema).min(1, "Add at least one treatment"),
  discountType: z.enum(["percent", "fixed"]).nullable(),
  discountValue: z.number().min(0),
  notes: z.string().trim().max(1000).nullable(),
  payNow: z.number().int().min(0),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "wallet", "other"]),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

/**
 * Creates an invoice from a set of lines. Prices are read from the database,
 * never from the client, and every discount is re-checked against both the
 * operator's ceiling and the service's own cap before anything is written.
 */
export async function createInvoice(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { clinic, member } = await requireActivePermission("invoice:create");

    const parsed = invoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the invoice details.",
      };
    }

    const data = parsed.data;
    const wantsDiscount =
      (data.discountType && data.discountValue > 0) ||
      data.lines.some((l) => l.discountType && l.discountValue > 0);

    if (wantsDiscount && !can(member, "invoice:discount")) {
      return {
        ok: false,
        error: "You do not have permission to give a discount.",
      };
    }

    const serviceIds = [...new Set(data.lines.map((l) => l.serviceId))];
    const catalogue = await db
      .select()
      .from(services)
      .where(
        and(
          eq(services.clinicId, clinic.id),
          inArray(services.id, serviceIds),
        ),
      );

    const byId = new Map(catalogue.map((s) => [s.id, s]));
    if (byId.size !== serviceIds.length) {
      return { ok: false, error: "One of those treatments no longer exists." };
    }

    const operatorCap = maxDiscountFor(member);

    // Every line is priced from the catalogue row, so a tampered payload
    // cannot set its own price.
    const lines = data.lines.map((line) => {
      const service = byId.get(line.serviceId)!;
      return {
        service,
        unitPrice: service.price,
        quantity: line.quantity,
        discountType: line.discountType,
        discountValue: line.discountValue,
      };
    });

    for (const line of lines) {
      if (!line.discountType || line.discountValue <= 0) continue;

      const gross = line.unitPrice * line.quantity;
      const asPercent =
        line.discountType === "percent"
          ? line.discountValue
          : gross > 0
            ? (line.discountValue / gross) * 100
            : 0;

      if (asPercent > operatorCap) {
        return {
          ok: false,
          error: `You can give at most ${operatorCap}% discount.`,
        };
      }

      const serviceCap = Number(line.service.maxDiscountPercent);
      if (asPercent > serviceCap) {
        return {
          ok: false,
          error: `${line.service.name} allows at most ${serviceCap}% discount.`,
        };
      }
    }

    const totals = computeInvoiceTotals({
      lines: lines.map((l) => ({
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        discountType: l.discountType,
        discountValue: l.discountValue,
      })),
      invoiceDiscountType: data.discountType,
      invoiceDiscountValue: data.discountValue,
      taxPercent: Number(clinic.taxPercent),
    });

    // The invoice-level discount is checked after the maths, since a fixed
    // amount is only meaningful against the computed subtotal.
    if (data.discountType && data.discountValue > 0) {
      const base = totals.subtotal - totals.lineDiscountTotal;
      const asPercent =
        base > 0 ? (totals.invoiceDiscountAmount / base) * 100 : 0;
      if (asPercent > operatorCap + 0.001) {
        return {
          ok: false,
          error: `You can give at most ${operatorCap}% discount.`,
        };
      }
    }

    const payNow = Math.min(data.payNow, totals.total);
    const status =
      payNow >= totals.total && totals.total > 0
        ? "paid"
        : payNow > 0
          ? "partial"
          : "unpaid";

    const invoiceId = await db.transaction(async (tx) => {
      const sequence = await nextInvoiceSequence(clinic.id);
      const number = formatInvoiceNumber(clinic.invoicePrefix, sequence);

      const [invoice] = await tx
        .insert(invoices)
        .values({
          clinicId: clinic.id,
          number,
          patientId: data.patientId,
          status,
          subtotal: totals.subtotal,
          discountType: data.discountType,
          discountValue: String(data.discountValue),
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          total: totals.total,
          amountPaid: payNow,
          notes: data.notes,
          createdBy: member.id,
          discountApprovedBy: wantsDiscount ? member.id : null,
        })
        .returning();

      await tx.insert(invoiceItems).values(
        lines.map((line, index) => {
          const computed = totals.lines[index];
          return {
            clinicId: clinic.id,
            invoiceId: invoice.id,
            serviceId: line.service.id,
            name: line.service.name,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            discountType: line.discountType,
            discountValue: String(line.discountValue),
            discountAmount: computed.discountAmount,
            lineTotal: computed.lineTotal,
            sortOrder: index,
          };
        }),
      );

      if (payNow > 0) {
        await tx.insert(payments).values({
          clinicId: clinic.id,
          invoiceId: invoice.id,
          amount: payNow,
          method: data.paymentMethod,
          receivedBy: member.id,
        });
      }

      await tx.insert(auditLogs).values({
        clinicId: clinic.id,
        memberId: member.id,
        action: "invoice.created",
        entityType: "invoice",
        entityId: invoice.id,
        metadata: {
          number,
          total: totals.total,
          discount: totals.discountAmount,
        },
      });

      return invoice.id;
    });

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true, invoiceId };
  } catch (error) {
    return toResult(error);
  }
}

const paymentSchema = z.object({
  amount: z.number().int().min(1, "Enter an amount"),
  method: z.enum(["cash", "card", "bank_transfer", "wallet", "other"]),
  reference: z.string().trim().max(120).nullable(),
});

export async function recordPayment(
  invoiceId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { clinic, member } = await requireActivePermission("payment:record");

    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Check the payment details.",
      };
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinic.id)),
      )
      .limit(1);

    if (!invoice) return { ok: false, error: "That invoice no longer exists." };
    if (invoice.status === "void") {
      return { ok: false, error: "This invoice has been voided." };
    }

    const outstanding = invoice.total - invoice.amountPaid;
    if (outstanding <= 0) {
      return { ok: false, error: "This invoice is already settled." };
    }

    // Overpayment is clamped rather than rejected, so a rounded cash amount
    // does not block the desk.
    const amount = Math.min(parsed.data.amount, outstanding);
    const paid = invoice.amountPaid + amount;

    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        clinicId: clinic.id,
        invoiceId,
        amount,
        method: parsed.data.method,
        reference: parsed.data.reference,
        receivedBy: member.id,
      });

      await tx
        .update(invoices)
        .set({
          amountPaid: paid,
          status: paid >= invoice.total ? "paid" : "partial",
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));
    });

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true, invoiceId };
  } catch (error) {
    return toResult(error);
  }
}

export async function voidInvoice(
  invoiceId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { clinic, member } = await requireActivePermission("invoice:void");

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.clinicId, clinic.id)),
      )
      .limit(1);

    if (!invoice) return { ok: false, error: "That invoice no longer exists." };

    // Voided rather than deleted: the number stays taken and the reason is
    // recorded, which is what an auditor expects to find.
    await db
      .update(invoices)
      .set({ status: "void", updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    await db.insert(auditLogs).values({
      clinicId: clinic.id,
      memberId: member.id,
      action: "invoice.voided",
      entityType: "invoice",
      entityId: invoiceId,
      metadata: { number: invoice.number, reason, total: invoice.total },
    });

    // revalidatePath only busts the server render cache for one path;
    // it does not touch the client Router Cache, so a Link click right
    // after this write could still hand back a payload from before it.
    // "layout" clears every route under the (app) group in both places.
    revalidatePath("/", "layout");
    return { ok: true, invoiceId };
  } catch (error) {
    return toResult(error);
  }
}
