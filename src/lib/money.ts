/**
 * Money is stored and passed around as an integer number of minor units
 * (paisa, cents). It is converted to a decimal exactly once, at render time.
 */

/** Currencies whose minor unit is not 1/100 of the major unit. */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK"]);

/**
 * Currencies still stored in minor units, but whose fractional part nobody
 * writes down in practice. A clinic in Karachi prices in whole rupees, and
 * "Rs 3,000.00" reads as a machine's output rather than a price list.
 */
const WHOLE_UNIT_DISPLAY = new Set(["PKR", "INR", "LKR", "NPR", "BDT"]);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
}

function fractionDigits(currency: string, amountInMajor: number): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  // Show paisa only when there actually are some — a part payment of
  // Rs 1,250.50 must not be rounded away.
  if (WHOLE_UNIT_DISPLAY.has(code)) {
    return Number.isInteger(amountInMajor) ? 0 : 2;
  }
  return 2;
}

export function formatMoney(
  minorUnits: number,
  currency = "PKR",
  locale = "en-PK",
): string {
  const factor = minorUnitFactor(currency);
  const amount = minorUnits / factor;
  const digits = fractionDigits(currency, amount);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** Compact form for dashboard tiles: PKR 1.2M rather than PKR 1,200,000.00 */
export function formatMoneyCompact(
  minorUnits: number,
  currency = "PKR",
  locale = "en-PK",
): string {
  const factor = minorUnitFactor(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minorUnits / factor);
}

/** Parse user input ("1,250.50") into minor units. Returns null if invalid. */
export function parseMoney(input: string, currency = "PKR"): number | null {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * minorUnitFactor(currency));
}

export type DiscountType = "percent" | "fixed";

/**
 * Discount on a line or an invoice. Percent is applied to `base`; fixed is
 * already in minor units. Never returns more than `base`, so a total can never
 * go negative.
 */
export function discountAmount(
  base: number,
  type: DiscountType | null | undefined,
  value: number,
): number {
  if (!type || !value || base <= 0) return 0;
  const raw = type === "percent" ? (base * value) / 100 : value;
  return Math.min(Math.max(Math.round(raw), 0), base);
}

export interface LineInput {
  unitPrice: number;
  quantity: number;
  discountType?: DiscountType | null;
  discountValue?: number;
}

export interface LineTotals {
  gross: number;
  discountAmount: number;
  lineTotal: number;
}

export function computeLine(line: LineInput): LineTotals {
  const gross = line.unitPrice * line.quantity;
  const discount = discountAmount(
    gross,
    line.discountType,
    line.discountValue ?? 0,
  );
  return { gross, discountAmount: discount, lineTotal: gross - discount };
}

export interface InvoiceTotalsInput {
  lines: LineInput[];
  invoiceDiscountType?: DiscountType | null;
  invoiceDiscountValue?: number;
  taxPercent?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  lineDiscountTotal: number;
  invoiceDiscountAmount: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  lines: LineTotals[];
}

/**
 * Line discounts come off first, then an invoice-level discount on what is
 * left, and tax is charged on the discounted amount — the order clinics and
 * tax authorities both expect.
 */
export function computeInvoiceTotals({
  lines,
  invoiceDiscountType,
  invoiceDiscountValue = 0,
  taxPercent = 0,
}: InvoiceTotalsInput): InvoiceTotals {
  const computed = lines.map(computeLine);
  const subtotal = computed.reduce((sum, l) => sum + l.gross, 0);
  const lineDiscountTotal = computed.reduce(
    (sum, l) => sum + l.discountAmount,
    0,
  );
  const afterLineDiscounts = subtotal - lineDiscountTotal;

  const invoiceDiscount = discountAmount(
    afterLineDiscounts,
    invoiceDiscountType,
    invoiceDiscountValue,
  );
  const taxable = afterLineDiscounts - invoiceDiscount;
  const tax = taxPercent > 0 ? Math.round((taxable * taxPercent) / 100) : 0;

  return {
    subtotal,
    lineDiscountTotal,
    invoiceDiscountAmount: invoiceDiscount,
    discountAmount: lineDiscountTotal + invoiceDiscount,
    taxAmount: tax,
    total: taxable + tax,
    lines: computed,
  };
}

/** Zero-padded invoice number, e.g. INV-000042. */
export function formatInvoiceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}
