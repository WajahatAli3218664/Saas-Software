import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getServicesWithCategories, getCategories } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import { ServiceDialog } from "./service-dialog";
import { CategoryDialog } from "./category-dialog";
import { ServicesBoard } from "./services-board";

// Every render here depends on the signed-in tenant and must never
// be cached or shared across requests.
export const dynamic = "force-dynamic";

export const metadata = { title: "Services" };

/** The symbol alone, for use as a field prefix where the code is redundant. */
function symbolFor(currency: string): string {
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

export default async function ServicesPage() {
  const { clinic, member } = await requireTenantSession();
  const [rows, categories] = await Promise.all([
    getServicesWithCategories(clinic.id),
    getCategories(clinic.id),
  ]);

  const canCreate = can(member, "service:create");
  const canEditPrice = can(member, "service:edit_price");
  const canDelete = can(member, "service:delete");
  const symbol = symbolFor(clinic.currency);

  const activeCount = rows.filter((r) => r.isActive).length;
  const catalogueValue = rows.reduce(
    (sum, r) => (r.isActive ? sum + r.price : sum),
    0,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Services
          </h1>
          <p className="text-muted-foreground text-sm">
            {activeCount} on the menu
            {activeCount !== rows.length && ` · ${rows.length - activeCount} hidden`}
            {" · "}
            {categories.length} {categories.length === 1 ? "category" : "categories"}
            {catalogueValue > 0 && (
              <> · {formatMoney(catalogueValue, clinic.currency)} combined value</>
            )}
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <CategoryDialog />
            <ServiceDialog
              categories={categories}
              currency={clinic.currency}
              currencySymbol={symbol}
              canEditPrice={canEditPrice}
            />
          </div>
        )}
      </header>

      <ServicesBoard
        rows={rows}
        categories={categories}
        currency={clinic.currency}
        currencySymbol={symbol}
        canCreate={canCreate}
        canEditPrice={canEditPrice}
        canDelete={canDelete}
      />
    </div>
  );
}
