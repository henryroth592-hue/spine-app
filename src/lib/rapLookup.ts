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

  // Find highest size_from that is <= weight
  const tiers = Object.keys(shapePrices).map(Number).filter((t) => t <= weight);
  if (tiers.length === 0) return null;
  const tier = String(Math.max(...tiers));

  return shapePrices[tier]?.[color]?.[clarity] ?? null;
}

export const RAP_EXPORTED_AT = rapData.exportedAt;
