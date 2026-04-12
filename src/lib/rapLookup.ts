import rapData from "@/data/rap_prices.json";
import type { Shape, StoneColor, StoneClarity } from "./types";

const prices = rapData.prices as Record<string, Record<string, Record<string, Record<string, number>>>>;

// Shape → Rap list name (same rule as fact_inventory_rap.sql)
function rapShape(shape: Shape): string {
  return shape === "round" ? "Round" : "Pear";
}

/**
 * Look up Rapaport price per carat for a single stone.
 * Finds the correct size tier (MAX size_from <= weight), then exact color+clarity.
 * Returns null if no matching tier or grade found.
 */
export function getRapPrice(shape: Shape, weight: number, color: StoneColor, clarity: StoneClarity): number | null {
  const shapeKey = rapShape(shape);
  const shapePrices = prices[shapeKey];
  if (!shapePrices) return null;

  // Find highest size_from that is <= weight (keep original string key to avoid 1.0 → "1" mismatch)
  const tierKey = Object.keys(shapePrices)
    .filter((k) => Number(k) <= weight)
    .reduce<string | null>((best, k) => best === null || Number(k) > Number(best) ? k : best, null);
  if (!tierKey) return null;
  const tier = tierKey;

  return shapePrices[tier]?.[color]?.[clarity] ?? null;
}

export const RAP_EXPORTED_AT = rapData.exportedAt;
