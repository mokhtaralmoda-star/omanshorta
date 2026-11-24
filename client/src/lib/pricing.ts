// Single source of truth for store pricing.
export const DISCOUNT_RATE = 0.25;

/** Round to 3 decimals (Omani baisa / KNET fils). */
export function roundMoney(v: number): number {
  const n = Number(v) || 0;
  return Math.round(n * 1000) / 1000;
}

/** One line price after discount, rounded. */
export function discountedPrice(price: string | number, qty = 1): number {
  const p = Number(price) || 0;
  return roundMoney(p * qty * (1 - DISCOUNT_RATE));
}

/** Payable total = sum of rounded discounted lines. */
export function discountedTotal(items: { priceNum: string | number; quantity: number }[]): number {
  return roundMoney((items || []).reduce((s, i) => s + discountedPrice(i.priceNum, i.quantity), 0));
}

export function savePayable(amount: number): void {
  localStorage.setItem("amouage_order_total", String(roundMoney(amount)));
}

export function readPayable(fallback = 0): number {
  const v = Number(localStorage.getItem("amouage_order_total"));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function clearPayable(): void {
  localStorage.removeItem("amouage_order_total");
}
export interface Quote { id: string; subtotal: number; payable: number; }

export async function fetchQuote(items: { priceNum: string | number; quantity: number }[]): Promise<Quote> {
  const res = await fetch("/api/order/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: (items || []).map((i) => ({ priceNum: i.priceNum, quantity: i.quantity })) }),
  });
  if (!res.ok) throw new Error("quote_failed");
  return (await res.json()) as Quote;
}

export async function fetchQuoteById(id: string): Promise<Quote | null> {
  try {
    const res = await fetch(`/api/order/quote/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return (await res.json()) as Quote;
  } catch {
    return null;
  }
}