import type { Shape, SizeRange, ColorBand, Clarity } from "./types";
import priceData from "@/data/prices.json";

export function getBandPrice(
  shape: Shape,
  sizeRange: SizeRange,
  colorBand: ColorBand,
  clarity: Clarity
): number | null {
  const table = shape === "round" ? priceData.round : priceData.fancy;
  return table[sizeRange]?.[clarity]?.[colorBand] ?? null;
}

export function calcEffectivePrice(
  bandPrice: number | null,
  mode: string,
  discountPct: number | null,
  overridePrice: number | null
): number | null {
  if (mode === "band") return bandPrice;
  if (mode === "discount" && bandPrice !== null && discountPct !== null) {
    // discountPct is e.g. -75, so multiply rap by (1 + -75/100)
    // bandPrice is already at -80; recalculate from rap
    const rapPerCt = bandPrice / 0.20; // reverse the -80 discount
    return Math.round(rapPerCt * (1 + discountPct / 100));
  }
  if (mode === "override" && overridePrice !== null) return overridePrice;
  return null;
}

export const SIZE_RANGES: SizeRange[] = ["18-22", "23-29", "30-39", "40-49", "50-69"];
export const COLOR_BANDS: ColorBand[] = ["D-G", "H-J", "K-M", "N+"];
export const CLARITIES: Clarity[] = ["VS", "SI1", "SI2", "I1", "I2"];

export const PRICE_UPDATED = priceData.updatedAt;
