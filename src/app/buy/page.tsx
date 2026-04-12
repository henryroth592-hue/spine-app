"use client";

import { useState, useCallback } from "react";
import type { CartItem, Shape, SizeRange, ColorBand, Clarity, PricingMode } from "@/lib/types";
import { getBandPrice, calcEffectivePrice, SIZE_RANGES, COLOR_BANDS, CLARITIES, PRICE_UPDATED } from "@/lib/priceUtils";

// ── helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number | null) => n !== null ? `$${n.toLocaleString()}` : "—";

const VENDORS = ["New vendor…", "Walk-in", "Estate buyer", "Dealer A", "Dealer B"];

// Average weight per stone for each size range (used for line total)
const AVG_WEIGHT: Record<string, number> = {
  "18-22": 0.20,
  "23-29": 0.26,
  "30-39": 0.345,
  "40-49": 0.445,
  "50-69": 0.595,
};

// ── small button ─────────────────────────────────────────────────────────────
function Chip({
  label, active, onClick, disabled,
}: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all select-none
        ${active
          ? "bg-zinc-900 text-white border-zinc-900"
          : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500"}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {label}
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function BuyPage() {
  // ── form state ──
  const [vendor, setVendor] = useState("Walk-in");
  const [customVendor, setCustomVendor] = useState("");
  const [shape, setShape] = useState<Shape>("round");
  const [sizeRange, setSizeRange] = useState<SizeRange>("23-29");
  const [colorBand, setColorBand] = useState<ColorBand>("H-J");
  const [clarity, setClarity] = useState<Clarity>("SI1");
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<PricingMode>("band");
  const [discountPct, setDiscountPct] = useState<number>(-75);
  const [discountInput, setDiscountInput] = useState<string>("-75");
  const [overridePrice, setOverridePrice] = useState<number | null>(null);

  // ── cart state ──
  const [cart, setCart] = useState<CartItem[]>([]);
  const [groupedView, setGroupedView] = useState(false);

  // ── derived ──
  const activeVendor = vendor === "New vendor…" ? customVendor.trim() : vendor;
  const bandPrice = getBandPrice(shape, sizeRange, colorBand, clarity);
  const effectivePrice = calcEffectivePrice(bandPrice, mode, discountPct, overridePrice);
  const avgWeight = AVG_WEIGHT[sizeRange] ?? 0.30;
  const lineTotal = effectivePrice !== null ? Math.round(effectivePrice * avgWeight * qty) : null;

  // ── handlers ──
  const addToCart = useCallback(() => {
    if (!activeVendor || effectivePrice === null) return;
    const item: CartItem = {
      id: uid(),
      vendor: activeVendor,
      shape,
      sizeRange,
      colorBand,
      clarity,
      qty,
      pricingMode: mode,
      bandPrice,
      discountPct: mode === "discount" ? discountPct : null,
      overridePrice: mode === "override" ? overridePrice : null,
      recutData: null,
      effectivePrice,
      lineTotal,
    };
    setCart((prev) => [...prev, item]);
  }, [activeVendor, shape, sizeRange, colorBand, clarity, qty, mode, bandPrice, discountPct, overridePrice, effectivePrice, lineTotal]);

  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const screenTotal = cart.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);

  // ── grouped view ──
  const groupedCart = cart.reduce<Record<string, CartItem[]>>((acc, item) => {
    const key = `${item.vendor} — ${item.shape} ${item.sizeRange} ${item.colorBand} ${item.clarity}`;
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-zinc-900">Diamond Buy</h1>
        <p className="text-xs text-zinc-400">Prices updated {PRICE_UPDATED} · -80 Rap</p>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Vendor */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Vendor</label>
          <select
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white"
          >
            {VENDORS.map((v) => <option key={v}>{v}</option>)}
          </select>
          {vendor === "New vendor…" && (
            <input
              placeholder="Vendor name"
              value={customVendor}
              onChange={(e) => setCustomVendor(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
        </div>

        {/* Stone details */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">

          {/* Shape */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Shape</label>
            <div className="flex gap-2">
              <Chip label="Round" active={shape === "round"} onClick={() => setShape("round")} />
              <Chip label="Fancy" active={shape === "fancy"} onClick={() => setShape("fancy")} />
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Size (pts)</label>
            <div className="flex flex-wrap gap-2">
              {SIZE_RANGES.map((s) => (
                <Chip key={s} label={s} active={sizeRange === s} onClick={() => setSizeRange(s)} />
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_BANDS.map((c) => {
                const unavail = bandPrice === null && colorBand === c;
                return (
                  <Chip key={c} label={c} active={colorBand === c} onClick={() => setColorBand(c)} />
                );
              })}
            </div>
          </div>

          {/* Clarity */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Clarity</label>
            <div className="flex flex-wrap gap-2">
              {CLARITIES.map((cl) => (
                <Chip key={cl} label={cl} active={clarity === cl} onClick={() => setClarity(cl)} />
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Quantity (stones)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full border border-zinc-300 text-xl font-light flex items-center justify-center"
              >−</button>
              <span className="text-2xl font-semibold w-10 text-center">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="w-10 h-10 rounded-full border border-zinc-300 text-xl font-light flex items-center justify-center"
              >+</button>
            </div>
          </div>
        </div>

        {/* Pricing mode */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Pricing Mode</label>
          <div className="flex gap-2 flex-wrap">
            {(["band", "discount", "override"] as PricingMode[]).map((m) => (
              <Chip
                key={m}
                label={m === "band" ? "Sheet -80" : m === "discount" ? "Disc %" : "Override"}
                active={mode === m}
                onClick={() => setMode(m)}
              />
            ))}
          </div>

          {mode === "discount" && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Discount % (e.g. -75)</label>
              <input
                type="text"
                inputMode="decimal"
                value={discountInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setDiscountInput(val);
                  const parsed = parseFloat(val);
                  if (!isNaN(parsed)) setDiscountPct(parsed);
                }}
                className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-32"
              />
              {bandPrice !== null && (
                <p className="text-xs text-zinc-400">Rap: ${Math.round(bandPrice / 0.20).toLocaleString()}/ct</p>
              )}
            </div>
          )}

          {mode === "override" && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Price per carat ($)</label>
              <input
                type="number"
                value={overridePrice ?? ""}
                onChange={(e) => setOverridePrice(e.target.value ? Number(e.target.value) : null)}
                className="border border-zinc-300 rounded-lg px-3 py-2 text-sm w-32"
              />
            </div>
          )}

          {/* Price preview */}
          <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-zinc-400">Per carat</p>
              <p className="text-xl font-bold text-zinc-900">{fmt(effectivePrice)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">× {qty} × {avgWeight}ct</p>
              <p className="text-xl font-bold text-zinc-900">{fmt(lineTotal)}</p>
            </div>
          </div>

          {bandPrice === null && (
            <p className="text-xs text-amber-600">No sheet price for this combination (N+ not on Rap list for this size)</p>
          )}

          <button
            type="button"
            onClick={addToCart}
            disabled={!activeVendor || effectivePrice === null}
            className="w-full bg-zinc-900 text-white rounded-xl py-3 font-semibold text-base
              disabled:opacity-40 disabled:cursor-not-allowed active:bg-zinc-700 transition-colors"
          >
            Add to Cart
          </button>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Cart ({cart.length} {cart.length === 1 ? "line" : "lines"})
              </label>
              <button
                type="button"
                onClick={() => setGroupedView((v) => !v)}
                className="text-xs text-zinc-500 underline"
              >
                {groupedView ? "Individual view" : "Grouped view"}
              </button>
            </div>

            <div className="space-y-2">
              {groupedView
                ? Object.entries(groupedCart).map(([key, items]) => {
                    const totalQty = items.reduce((s, i) => s + i.qty, 0);
                    const groupTotal = items.reduce((s, i) => s + (i.lineTotal ?? 0), 0);
                    return (
                      <div key={key} className="flex justify-between text-sm py-1 border-b border-zinc-100 last:border-0">
                        <div>
                          <p className="font-medium text-zinc-800">{key}</p>
                          <p className="text-zinc-400">{totalQty} stones</p>
                        </div>
                        <p className="font-semibold text-zinc-900">{fmt(groupTotal)}</p>
                      </div>
                    );
                  })
                : cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm py-1 border-b border-zinc-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-800 truncate">
                          {item.vendor} · {item.shape === "round" ? "Rnd" : "Fancy"} {item.sizeRange} {item.colorBand} {item.clarity}
                        </p>
                        <p className="text-zinc-400">
                          {item.qty} × {fmt(item.effectivePrice)}
                          {item.pricingMode !== "band" && (
                            <span className="ml-1 text-xs text-zinc-300">
                              ({item.pricingMode === "discount" ? `${item.discountPct}%` : "override"})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-2">
                        <p className="font-semibold text-zinc-900">{fmt(item.lineTotal)}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-zinc-300 hover:text-red-400 text-lg leading-none"
                        >×</button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Sticky total */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-4 py-4 z-10">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Screen Total</p>
            <p className="text-2xl font-bold text-zinc-900">{fmt(screenTotal || null)}</p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-sm text-zinc-400 underline"
            >
              Clear cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
