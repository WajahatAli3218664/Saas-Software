import { Sparkles } from "lucide-react";
import { requireTenantSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getServicesWithCategories, getCategories } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import { ServiceDialog } from "./service-dialog";
import { ServiceToggle } from "./service-toggle";

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
  const symbol = symbolFor(clinic.currency);

  // Grouped by category so the page reads like the clinic's own price list.
  const grouped = new Map<
    string,
    { name: string; color: string; items: typeof rows }
  >();

  for (const row of rows) {
    const key = row.categoryId ?? "uncategorised";
    if (!grouped.has(key)) {
      grouped.set(key, {
        name: row.categoryName ?? "Uncategorised",
        color: row.categoryColor ?? "#94a3b8",
        items: [],
      });
    }
    grouped.get(key)!.items.push(row);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Services
          </h1>
          <p className="text-muted-foreground text-sm">
            {rows.length} on the menu · {categories.length}{" "}
            {categories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        {canCreate && (
          <ServiceDialog
            categories={categories}
            currency={clinic.currency}
            currencySymbol={symbol}
            canEditPrice={canEditPrice}
          />
        )}
      </header>

      {rows.length === 0 ? (
        <div className="bg-card flex flex-col items-center gap-3 rounded-lg border px-6 py-16 text-center">
          <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-lg">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <p className="font-medium">No services yet</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Add the treatments your clinic offers. Each one can carry its own
            price, duration and discount ceiling.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {[...grouped.entries()].map(([key, group]) => (
            <section key={key} className="bg-card rounded-lg border">
              <header className="flex items-center gap-2 border-b px-4 py-2.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: group.color }}
                  aria-hidden
                />
                <h2 className="text-sm font-medium">{group.name}</h2>
                <span className="text-muted-foreground ml-auto text-xs">
                  {group.items.length}
                </span>
              </header>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground border-b text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">
                        Service
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Duration
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Max discount
                      </th>
                      <th className="px-4 py-2 text-right font-medium">
                        Price
                      </th>
                      <th className="w-24 px-4 py-2 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((service) => (
                      <tr
                        key={service.id}
                        className="hover:bg-muted/40 border-b last:border-0"
                      >
                        <td className="px-4 py-2.5">
                          <div
                            className={
                              service.isActive
                                ? "font-medium"
                                : "text-muted-foreground font-medium line-through"
                            }
                          >
                            {service.name}
                          </div>
                          {service.description && (
                            <div className="text-muted-foreground max-w-md truncate text-xs">
                              {service.description}
                            </div>
                          )}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                          {service.durationMinutes} min
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                          {Number(service.maxDiscountPercent)}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                          {formatMoney(service.price, clinic.currency)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {canCreate && (
                              <>
                                <ServiceToggle
                                  serviceId={service.id}
                                  isActive={service.isActive}
                                  name={service.name}
                                />
                                <ServiceDialog
                                  categories={categories}
                                  currency={clinic.currency}
                                  currencySymbol={symbol}
                                  canEditPrice={canEditPrice}
                                  service={{
                                    id: service.id,
                                    name: service.name,
                                    categoryId: service.categoryId,
                                    description: service.description,
                                    price: service.price,
                                    durationMinutes: service.durationMinutes,
                                    maxDiscountPercent:
                                      service.maxDiscountPercent,
                                  }}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
