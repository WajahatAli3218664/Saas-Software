import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { services, serviceCategories, patients } from "@/db/schema";
import { requireTenantSession } from "@/lib/auth";
import { can, maxDiscountFor } from "@/lib/permissions";
import { InvoiceBuilder } from "./invoice-builder";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage() {
  const { clinic, member } = await requireTenantSession();

  const [catalogue, patientList] = await Promise.all([
    db
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
        maxDiscountPercent: services.maxDiscountPercent,
        categoryName: serviceCategories.name,
      })
      .from(services)
      .leftJoin(
        serviceCategories,
        eq(services.categoryId, serviceCategories.id),
      )
      .where(and(eq(services.clinicId, clinic.id), eq(services.isActive, true)))
      .orderBy(serviceCategories.sortOrder, services.name),

    db
      .select({
        id: patients.id,
        code: patients.code,
        fullName: patients.fullName,
        phone: patients.phone,
      })
      .from(patients)
      .where(and(eq(patients.clinicId, clinic.id), eq(patients.isActive, true)))
      .orderBy(patients.fullName)
      .limit(500),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link
          href="/billing"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Billing
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          New invoice
        </h1>
      </header>

      <InvoiceBuilder
        catalogue={catalogue}
        patients={patientList}
        currency={clinic.currency}
        taxPercent={Number(clinic.taxPercent)}
        taxLabel={clinic.taxLabel}
        maxDiscount={maxDiscountFor(member)}
        canDiscount={can(member, "invoice:discount")}
      />
    </div>
  );
}
