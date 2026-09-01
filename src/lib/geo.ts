import { headers } from "next/headers";
import { regionForCountry, type PriceRegion } from "@/config/plans";

/**
 * Country of the request, from whichever edge header the host provides.
 * Vercel sets x-vercel-ip-country; Cloudflare sets cf-ipcountry. Falls back to
 * international pricing, which is the safer default to show a stranger.
 */
export async function getRequestCountry(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    h.get("x-country") ??
    null
  );
}

export async function getPriceRegion(): Promise<PriceRegion> {
  return regionForCountry(await getRequestCountry());
}
