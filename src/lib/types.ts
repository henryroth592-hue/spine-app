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
export type RecutLocation = number; // cut cost $/ct

// ── Metals ────────────────────────────────────────────────────────────────────
export type MetalCategory = "SG" | "RG";
export type Karat = "10k" | "12k" | "14k" | "18k" | "21k" | "22k" | "24k" | ".900" | ".925" | ".950" | ".999";

// ── Cart items ────────────────────────────────────────────────────────────────
export interface ParcelCartItem {
  id: string;
  itemType: "parcel";
  vendor: string;
  buyer: string;
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
  buyer: string;
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
  buyer: string;
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
  buyer: string;
  description: string;
  customItemType: string;
  weight?: number;
  weightUnit?: "ct" | "g";
  lineTotal: number;
}

export interface MeleeCartItem {
  id: string;
  itemType: "melee";
  vendor: string;
  buyer: string;
  group: string;
  assortmentKey: string;
  assortmentLabel: string;
  sizeRange: string;
  pricePerCt: number;
  weight: number;
  lineTotal: number;
}

export interface GemParcelCartItem {
  id: string;
  itemType: "gem-parcel";
  vendor: string;
  buyer: string;
  gemType: string;
  weight: number;
  pricePerCt: number;
  lineTotal: number;
}

export interface SingleGemCartItem {
  id: string;
  itemType: "single-gem";
  vendor: string;
  buyer: string;
  gemType: string;
  weight: number;
  pricePerCt: number;
  lineTotal: number;
}

export interface FJCartItem {
  id: string;
  itemType: "fj";
  vendor: string;
  buyer: string;
  fjName: string;
  jewelryType: string;
  components: CartItem[];
  lineTotal: number;
}

export type CartItem = ParcelCartItem | SingleCartItem | MetalCartItem | CustomCartItem | MeleeCartItem | GemParcelCartItem | SingleGemCartItem | FJCartItem;

export interface PriceTable {
  round: Record<SizeRange, Record<Clarity, Record<ColorBand, number | null>>>;
  fancy: Record<SizeRange, Record<Clarity, Record<ColorBand, number | null>>>;
  updatedAt: string;
}

// ── Payment ───────────────────────────────────────────────────────────────────
export type PaymentMethod = "cash" | "check" | "echeck" | "bank-transfer" | "store-credit";

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  account: string;
  checkNumber?: string;
  payee: string;
  date: string;
  amount: number;
  description: string;
  memo: string;
}
