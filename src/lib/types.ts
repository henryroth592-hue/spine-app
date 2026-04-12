// ── Diamond (Parcel) ──────────────────────────────────────────────────────────
export type Shape = "round" | "fancy";
export type SizeRange = "18-22" | "23-29" | "30-39" | "40-49" | "50-69";
export type ColorBand = "D-G" | "H-J" | "K-M" | "N+";
export type Clarity = "VS" | "SI1" | "SI2" | "I1" | "I2";
export type PricingMode = "band" | "discount";

// ── Single stone ──────────────────────────────────────────────────────────────
export type SingleShape = "BR" | "PR" | "MQ" | "OV" | "RA" | "EM" | "AS" | "OE" | "OM" | "PS" | "CU" | "FA";
export type StoneColor = "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N-";
export type StoneClarity = "IF" | "VVS1" | "VVS2" | "VS1" | "VS2" | "SI1" | "SI2" | "SI3" | "I1" | "I2" | "I3";
export type SingleMode = "as-is" | "recut";
export type RecutLocation = "USA" | "China";

// ── Metals ────────────────────────────────────────────────────────────────────
export type MetalCategory = "SG" | "RG";
export type Karat = "10k" | "12k" | "14k" | "18k" | "21k" | "22k" | "24k";

// ── Cart items ────────────────────────────────────────────────────────────────
export interface ParcelCartItem {
  id: string;
  itemType: "parcel";
  vendor: string;
  shape: Shape;
  sizeRange: SizeRange;
  colorBand: ColorBand;
  clarity: Clarity;
  qty: number;
  pricingMode: PricingMode;
  pricePerCt: number;
  avgWeight: number;
  lineTotal: number;
  discountPct?: number;
}

export interface SingleCartItem {
  id: string;
  itemType: "single";
  vendor: string;
  shape: SingleShape;
  weight: number;
  color: StoneColor;
  clarity: StoneClarity;
  rapPerCt: number;
  mode: SingleMode;
  // as-is
  asIsDiscountPct?: number;
  asIsPrice?: number;
  certCost?: number;
  asIsNet?: number;
  // recut
  recutLocation?: RecutLocation;
  endWeight?: number;
  endRapPerCt?: number;
  cuttingCost?: number;
  recutCertCost?: number;
  recutDiscountPct?: number;
  recutNet?: number;
  breakevenDisc?: number;
  lineTotal: number;
}

export interface MetalCartItem {
  id: string;
  itemType: "metal";
  vendor: string;
  category: MetalCategory;
  karat: Karat;
  grams: number;
  spotPerOz: number;
  pctOfSpot: number;
  lineTotal: number;
}

export interface CustomCartItem {
  id: string;
  itemType: "custom";
  vendor: string;
  description: string;
  lineTotal: number;
}

export type CartItem = ParcelCartItem | SingleCartItem | MetalCartItem | CustomCartItem;

export interface PriceTable {
  round: Record<SizeRange, Record<Clarity, Record<ColorBand, number | null>>>;
  fancy: Record<SizeRange, Record<Clarity, Record<ColorBand, number | null>>>;
  updatedAt: string;
}
