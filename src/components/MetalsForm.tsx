"use client";

import { useState, useEffect, useCallback } from "react";
import type { MetalCategory, Karat, MetalCartItem } from "@/lib/types";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TROY_OZ_PER_GRAM = 1 / 31.1035;

const KARAT_PURITY: Record<Karat, number> = {
  "10k": 10/24, "12k": 12/24, "14k": 14/24, "18k": 18/24,
  "21k": 21/24, "22k": 22/24, "24k": 24/24,
};
const KARATS: Karat[] = ["10k","12k","14k","18k","21k","22k","24k"];

interface Props { vendor: string; onAdd: (item: MetalCartItem) => void; }

export default function MetalsForm({ vendor, onAdd }: Props) {
  const [category, setCategory] = useState<MetalCategory>("SG");
  const [karat, setKarat] = useState<Karat>("14k");
  const [grams, setGrams] = useState<string>("");
  const [pctOfSpot, setPctOfSpot] = useState<string>("85");
  const [pctInput, setPctInput] = useState<string>("85");

  const [liveSpot, setLiveSpot] = useState<number | null>(null);
  const [spotStatus, setSpotStatus] = useState<"loading" | "live" | "manual" | "error">("loading");
  const [manualSpot, setManualSpot] = useState<string>("");
  const [useManual, setUseManual] = useState(false);

  // Fetch live gold price
  useEffect(() => {
    fetch("/api/gold")
      .then((r) => r.json())
      .then((d) => {
        if (d.price) { setLiveSpot(d.price); setSpotStatus("live"); }
        else { setSpotStatus("error"); setUseManual(true); }
      })
      .catch(() => { setSpotStatus("error"); setUseManual(true); });
  }, []);

  const spotPerOz = useManual ? (parseFloat(manualSpot) || 0) : (liveSpot ?? 0);
  const gramsNum = parseFloat(grams) || 0;
  const pct = parseFloat(pctOfSpot) || 0;
  const purity = KARAT_PURITY[karat];

  // paying = grams × (karat/24) × (spot/troy_oz) × (pct/100)
  const valuePerGram = spotPerOz > 0 ? spotPerOz * TROY_OZ_PER_GRAM * purity : 0;
  const totalValue = valuePerGram * gramsNum;
  const wePayTotal = totalValue * (pct / 100);
  const wePayPerGram = gramsNum > 0 ? wePayTotal / gramsNum : 0;

  const handleAdd = useCallback(() => {
    if (!vendor || gramsNum <= 0 || spotPerOz <= 0) return;
    onAdd({
      id: uid(), itemType: "metal", vendor, category, karat,
      grams: gramsNum, spotPerOz, pctOfSpot: pct,
      lineTotal: Math.round(wePayTotal * 100) / 100,
    });
  }, [vendor, category, karat, gramsNum, spotPerOz, pct, wePayTotal, onAdd]);

  return (
    <div className="space-y-4">

      {/* Spot price bar */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <p className="label">Gold Spot</p>
            {spotStatus === "loading" && <p className="text-sm text-zinc-400">Fetching live price…</p>}
            {spotStatus === "live" && !useManual && (
              <p className="text-lg font-bold text-zinc-900">{fmt(liveSpot!)} <span className="text-xs font-normal text-emerald-600">live</span></p>
            )}
            {(spotStatus === "error" || useManual) && (
              <p className="text-xs text-amber-600">{spotStatus === "error" ? "Live feed unavailable" : "Manual override"}</p>
            )}
          </div>
          <button type="button" onClick={() => setUseManual((v) => !v)}
            className="text-xs text-zinc-500 underline">
            {useManual ? "Use live" : "Override"}
          </button>
        </div>
        {useManual && (
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Spot price $/troy oz</label>
            <input type="text" inputMode="decimal" value={manualSpot}
              onChange={(e) => setManualSpot(e.target.value)}
              className="input w-40" placeholder="3250.00" />
          </div>
        )}
        {spotPerOz > 0 && (
          <p className="text-xs text-zinc-400">
            Pure gold: {fmt(spotPerOz * TROY_OZ_PER_GRAM)}/g
          </p>
        )}
      </div>

      {/* Metal details */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
        <div className="space-y-2">
          <label className="label">Category</label>
          <div className="flex gap-2">
            <Chip label="SG (Scrap Gold)" active={category === "SG"} onClick={() => setCategory("SG")} />
            <Chip label="RG (Removal Gold)" active={category === "RG"} onClick={() => setCategory("RG")} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="label">Karat</label>
          <div className="flex flex-wrap gap-2">
            {KARATS.map((k) => <Chip key={k} label={k} active={karat === k} onClick={() => setKarat(k)} />)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label">Grams</label>
            <input type="text" inputMode="decimal" value={grams}
              onChange={(e) => setGrams(e.target.value)} className="input w-full" placeholder="23.5" />
          </div>
          <div className="space-y-1">
            <label className="label">% of spot</label>
            <div className="flex items-center gap-1">
              <input type="text" inputMode="decimal" value={pctInput}
                onChange={(e) => { setPctInput(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p)) setPctOfSpot(String(p)); }}
                className="input w-20" />
              <span className="text-zinc-400 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calculation breakdown */}
      {gramsNum > 0 && spotPerOz > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2 text-sm">
          <p className="label mb-2">Calculation</p>
          <div className="flex justify-between"><span className="text-zinc-500">Spot</span><span>{fmt(spotPerOz)}/oz</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Karat purity</span><span>{(purity * 100).toFixed(2)}% ({karat})</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Pure gold value</span><span>{fmt(totalValue)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">We pay ({pct}% of spot)</span><span>{fmt(wePayTotal)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Per gram</span><span>{fmt(wePayPerGram)}</span></div>
          <div className="flex justify-between font-semibold border-t border-zinc-200 pt-2 text-lg">
            <span>Total</span><span>${wePayTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      <button type="button" onClick={handleAdd}
        disabled={!vendor || gramsNum <= 0 || spotPerOz <= 0}
        className="btn-primary w-full">
        Add to Cart
      </button>
    </div>
  );
}
