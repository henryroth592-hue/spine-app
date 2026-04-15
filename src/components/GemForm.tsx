"use client";

import { useState } from "react";
import type { GemParcelCartItem, SingleGemCartItem } from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

type GemMode = "gem-parcel" | "single-gem";

interface Props {
  vendor: string;
  buyer: string;
  onAdd: (item: GemParcelCartItem | SingleGemCartItem) => void;
}

export default function GemForm({ vendor, buyer, onAdd }: Props) {
  const [mode,         setMode]         = useState<GemMode>("gem-parcel");
  const [gemType,      setGemType]      = useState("");
  const [weightInput,  setWeightInput]  = useState("");
  const [priceInput,   setPriceInput]   = useState("");
  const [totalInput,   setTotalInput]   = useState("");

  const weight    = parseFloat(weightInput) || 0;
  const pricePerCt = parseFloat(priceInput) || 0;

  // Bidirectional: $/ct ↔ total
  const calcTotal  = pricePerCt > 0 && weight > 0 ? Math.round(pricePerCt * weight) : null;
  const calcPricePerCt = totalInput !== "" && weight > 0
    ? Math.round(parseFloat(totalInput.replace(/[^0-9.]/g, "")) / weight)
    : null;

  const effectivePrice = totalInput !== "" ? calcPricePerCt : pricePerCt || null;
  const effectiveTotal = totalInput !== "" ? (parseInt(totalInput.replace(/[^0-9]/g, "")) || null) : calcTotal;

  function handleAdd() {
    if (!vendor || !buyer || !gemType.trim() || weight <= 0 || effectivePrice === null || effectiveTotal === null) return;
    onAdd({
      id: uid(),
      itemType: mode,
      vendor,
      buyer,
      gemType: gemType.trim(),
      weight,
      pricePerCt: effectivePrice,
      lineTotal: effectiveTotal,
    } as GemParcelCartItem & SingleGemCartItem);
    setGemType("");
    setWeightInput("");
    setPriceInput("");
    setTotalInput("");
  }

  const canAdd = vendor && buyer && gemType.trim() && weight > 0 && effectivePrice !== null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">

        {/* Parcel vs Single toggle */}
        <div className="flex gap-2 border-b border-zinc-100 pb-3">
          <button type="button"
            onClick={() => setMode("gem-parcel")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors
              ${mode === "gem-parcel" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>
            Parcel
          </button>
          <button type="button"
            onClick={() => setMode("single-gem")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors
              ${mode === "single-gem" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>
            Single Stone
          </button>
        </div>

        <div className="space-y-1">
          <label className="label">Gem type</label>
          <input
            type="text" value={gemType}
            onChange={(e) => setGemType(e.target.value)}
            className="input w-full" placeholder="e.g. Ruby, Emerald, Sapphire…"
          />
        </div>

        <div className="space-y-1">
          <label className="label">Weight (ct)</label>
          <input
            type="text" inputMode="decimal" value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="input w-full" placeholder="e.g. 5.00"
          />
        </div>

        {/* Bidirectional $/ct ↔ total */}
        <div className="pt-2 border-t border-zinc-100 space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Price per carat</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">$</span>
              <input
                type="text" inputMode="decimal" value={priceInput}
                onChange={(e) => { setPriceInput(e.target.value); setTotalInput(""); }}
                placeholder={calcPricePerCt != null ? String(calcPricePerCt) : ""}
                className="input flex-1"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Total</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">$</span>
              <input
                type="text" inputMode="numeric" value={totalInput}
                onChange={(e) => { setTotalInput(e.target.value); setPriceInput(""); }}
                placeholder={calcTotal != null ? String(calcTotal) : ""}
                className="input flex-1"
              />
            </div>
          </div>

          {effectivePrice !== null && effectiveTotal !== null && weight > 0 && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-zinc-400">${effectivePrice}/ct × {weight}ct</span>
              <span className="text-xl font-bold text-zinc-900">{fmt(effectiveTotal)}</span>
            </div>
          )}
        </div>

        <button type="button" onClick={handleAdd} disabled={!canAdd}
          className="btn-primary w-full">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
