"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { ServiceDialog } from "./service-dialog";
import { ServiceToggle } from "./service-toggle";
import { ServiceDeleteButton } from "./service-delete-button";

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  maxDiscountPercent: string;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
}

/**
 * Everything below the header: search, the grouped price list, and every
 * row action. Client-rendered so filtering by name is instant rather than a
 * round trip — the full catalogue is small enough (a few hundred rows at
 * most) that there's nothing to gain from filtering on the server.
 */
export function ServicesBoard({
  rows,
  categories,
  currency,
  currencySymbol,
  canCreate,
  canEditPrice,
  canDelete,
}: {
  rows: ServiceRow[];
  categories: CategoryOption[];
  currency: string;
  currencySymbol: string;
  canCreate: boolean;
  canEditPrice: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.categoryName?.toLowerCase().includes(term) ||
        row.description?.toLowerCase().includes(term),
    );
  }, [rows, query]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; items: ServiceRow[] }
    >();
    for (const row of filtered) {
      const key = row.categoryId ?? "uncategorised";
      if (!map.has(key)) {
        map.set(key, {
          name: row.categoryName ?? "Uncategorised",
          color: row.categoryColor ?? "#94a3b8",
          items: [],
        });
      }
      map.get(key)!.items.push(row);
    }
    return [...map.entries()];
  }, [filtered]);

  if (rows.length === 0) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services…"
          className="pl-8 pr-8"
          aria-label="Search services"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 size-6 -translate-y-1/2"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Nothing matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([key, group]) => (
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
                      <th className="w-28 px-4 py-2 text-right font-medium">
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
                          {formatMoney(service.price, currency)}
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
                                  currency={currency}
                                  currencySymbol={currencySymbol}
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
                            {canDelete && (
                              <ServiceDeleteButton
                                serviceId={service.id}
                                name={service.name}
                              />
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
