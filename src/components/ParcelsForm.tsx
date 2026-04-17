"use client";

import { useState, useCallback } from "react";
import type { Shape, SizeRange, ColorBand, Clarity, PricingMode, ParcelCartItem } from "@/lib/types";
import { getBandPrice, calcEffectivePrice, SIZE_RANGES, COLOR_BANDS, CLARITIES, PRICE_UPDATED } from "@/lib/priceUtils";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number | null) => n !== null ? `$${n.toLocaleString()}` : "—";

const AVG_WEIGHT: Record<string, number> = {
  "18-22": 0.20, "23-29": 0.26, "30-39": 0.345, "40-49": 0.445, "50-69": 0.595,
};

interface Props { vendor: string; buyer: string; onAdd: (item: ParcelCartItem) => void; }

export default function ParcelsForm({ vendor, buyer, onAdd }: Props) {
  const [shape, setShape] = useState<Shape>("round");
  const [sizeRange, setSizeRange] = useState<SizeRange>("23-29");
  const [colorBand, setColorBand] = useState<ColorBand>("H-J");
  const [clarity, setClarity] = useState<Clarity>("SI1");
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<PricingMode>("band");
  const [discountPct, setDiscountPct] = useState(-75);
  const [discountInput, setDiscountInput] = useState("-75");

  // Actual weight override
  const [useActualWeight, setUseActualWeight] = useState(false);
  const [actualWeightInput, setActualWeightInput] = useState("");

  function toggleActualWeight(checked: boolean) {
    setUseActualWeight(checked);
    if (checked && !actualWeightInput) {
      setActualWeightInput((avgWeight * qty).toFixed(2));
    }
  }

  function stepWeight(delta: number) {
    const current = parseFloat(actualWeightInput) || avgWeight * qty;
    const next = Math.max(0.01, Math.round((current + delta) * 100) / 100);
    setActualWeightInput(next.toFixed(2));
  }

  // Editable total override
  const [totalOverride, setTotalOverride] = useState("");

  const bandPrice = getBandPrice(shape, sizeRange, colorBand, clarity);
  const effectivePrice = calcEffectivePrice(bandPrice, mode, discountPct, null);
  const avgWeight = AVG_WEIGHT[sizeRange] ?? 0.30;

  const actualWeight = parseFloat(actualWeightInput) || 0;
  const totalWeight = useActualWeight && actualWeight > 0 ? actualWeight : (avgWeight * qty);
  const calcLineTotal = effectivePrice !== null ? Math.round(effectivePrice * totalWeight) : null;
  const lineTotal = totalOverride !== "" ? (parseInt(totalOverride.replace(/[^0-9-]/g, "")) || 0) : calcLineTotal;

  const handleAdd = useCallback(() => {
    if (!vendor || effectivePrice === null || lineTotal === null) return;
    onAdd({
      id: uid(), itemType: "parcel", vendor, buyer, shape, sizeRange, colorBand, clarity,
      qty, pricingMode: mode, pricePerCt: effectivePrice,
      avgWeight: useActualWeight && actualWeight > 0 ? actualWeight / qty : avgWeight,
      lineTotal,
      discountPct: mode === "discount" ? discountPct : undefined,
    });
  }, [vendor, buyer, shape, sizeRange, colorBand, clarity, qty, mode, discountPct, effectivePrice, avgWeight, useActualWeight, actualWeight, lineTotal, onAdd]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400 text-right">Prices updated {PRICE_UPDATED} · -80 Rap</p>

      {/* Stone details */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
        <div className="space-y-2">
          <label className="label">Shape</label>
          <div className="flex gap-2">
            <Chip label="Round" active={shape === "round"} onClick={() => setShape("round")} />
            <Chip label="Fancy" active={shape === "fancy"} onClick={() => setShape("fancy")} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="label">Size (pts)</label>
          <div className="flex flex-wrap gap-2">
            {SIZE_RANGES.map((s) => <Chip key={s} label={s} active={sizeRange === s} onClick={() => setSizeRange(s)} />)}
          </div>
        </div>
        <div className="space-y-2">
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_BANDS.map((c) => <Chip key={c} label={c} active={colorBand === c} onClick={() => setColorBand(c)} />)}
          </div>
        </div>
        <div className="space-y-2">
          <label className="label">Clarity</label>
          <div className="flex flex-wrap gap-2">
            {CLARITIES.map((cl) => <Chip key={cl} label={cl} active={clarity === cl} onClick={() => setClarity(cl)} />)}
          </div>
        </div>

        {/* Qty + weight */}
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="label">Quantity (stones)</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="stepper">−</button>
              <span className="text-2xl font-semibold w-10 text-center">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} className="stepper">+</button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={useActualWeight}
              onChange={(e) => { if (!e.target.checked) setActualWeightInput(""); toggleActualWeight(e.target.checked); }}
              className="rounded" />
            Specify actual weight
          </label>
          {useActualWeight && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Total weight (ct)</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => stepWeight(-0.01)} className="stepper">−</button>
                <input type="text" inputMode="decimal" value={actualWeightInput}
                  onChange={(e) => setActualWeightInput(e.target.value)}
                  className="input w-24 text-center" />
                <button type="button" onClick={() => stepWeight(0.01)} className="stepper">+</button>
              </div>
              <p className="text-xs text-zinc-400">{avgWeight}ct avg × {qty} = {(avgWeight * qty).toFixed(3)}ct expected</p>
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <label className="label">Pricing Mode</label>
        <div className="flex gap-2 flex-wrap">
          {(["band", "discount"] as PricingMode[]).map((m) => (
            <Chip key={m} label={m === "band" ? "Sheet -80" : "Disc %"} active={mode === m} onClick={() => setMode(m)} />
          ))}
        </div>

        {mode === "discount" && (
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Discount %</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { const f = discountPct * -1; setDiscountPct(f); setDiscountInput(String(f)); }}
                className="w-10 h-10 rounded-lg border border-zinc-300 text-lg font-medium flex items-center justify-center">±</button>
              <input type="text" inputMode="decimal" value={discountInput}
                onChange={(e) => { setDiscountInput(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p)) setDiscountPct(p); }}
                className="input w-28" />
            </div>
            {bandPrice !== null && <p className="text-xs text-zinc-400">Rap: ${Math.round(bandPrice / 0.20).toLocaleString()}/ct</p>}
          </div>
        )}

        {bandPrice === null && <p className="text-xs text-amber-600">No sheet price for N+ at this size</p>}

        <div className="pt-2 border-t border-zinc-100 space-y-2">
          <div className="flex justify-between items-center">
            <div><p className="text-xs text-zinc-400">Per carat</p><p className="text-xl font-bold">{fmt(effectivePrice)}</p></div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">
                {useActualWeight && actualWeight > 0 ? `${actualWeight}ct actual` : `× ${qty} × ${avgWeight}ct`}
              </p>
              <p className="text-xl font-bold">{fmt(calcLineTotal)}</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Total override (optional)</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">$</span>
              <input type="text" inputMode="numeric" value={totalOverride}
                onChange={(e) => setTotalOverride(e.target.value)}
                placeholder={calcLineTotal != null ? String(calcLineTotal) : ""}
                className="input flex-1" />
              {totalOverride && (
                <button type="button" onClick={() => setTotalOverride("")} className="text-xs text-zinc-400 underline shrink-0">clear</button>
              )}
            </div>
          </div>
        </div>

        <button type="button" onClick={handleAdd} disabled={!vendor || effectivePrice === null}
          className="btn-primary w-full">Add to Cart</button>
      </div>
    </div>
  );
}
