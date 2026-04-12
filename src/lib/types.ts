export type Shape = "round" | "fancy";
export type SizeRange = "18-22" | "23-29" | "30-39" | "40-49" | "50-69";
export type ColorBand = "D-G" | "H-J" | "K-M" | "N+";
export type Clarity = "VS" | "SI1" | "SI2" | "I1" | "I2";
export type PricingMode = "band" | "discount" | "override" | "recut";

export interface CartItem {
  id: string;
  vendor: string;
  shape: Shape;
  sizeRange: SizeRange;
  colorBand: ColorBand;
  clarity: Clarity;
  qty: number;
  pricingMode: PricingMode;
  bandPrice: number | null;   // -80 rap price from sheet
  discountPct: number | null; // e.g. -75 for discount mode
  overridePrice: number | null;
  recutData: RecutData | null;
  effectivePrice: number | null; // price per carat actually used
  lineTotal: number | null;      // effectivePrice × qty
}

export interface RecutData {
  startingWeight: number;
  endWeightEst: number;   // startingWeight × 0.90
  location: "USA" | "China";
  cuttingCost: number;    // total cutting cost
  certCost: number;
  breakeven: number | null; // discount % needed to break even
}

export interface PriceTable {
  round: Record<SizeRange, Record<Clarity, Record<ColorBand, number | null>>>;
  fancy: Record<SizeRange, Record<Clarity, Record<ColorBand, number | null>>>;
  updatedAt: string;
}
