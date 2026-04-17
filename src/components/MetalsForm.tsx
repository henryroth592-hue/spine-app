"use client";

import { useState, useEffect, useCallback } from "react";
import type { MetalCategory, Karat, MetalCartItem } from "@/lib/types";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TROY_OZ_PER_GRAM = 1 / 31.1035;

type MetalType = "gold" | "silver" | "platinum";

const METAL_CONFIG: Record<MetalType, {
  label: string;
  apiRoute: string;
  karat: Karat;
  defaultPct: string;
}> = {
  gold:     { label: "Gold",     apiRoute: "/api/gold",     karat: "14k",  defaultPct: "90" },
  silver:   { label: "Silver",   apiRoute: "/api/silver",   karat: ".925", defaultPct: "90" },
  platinum: { label: "Platinum", apiRoute: "/api/platinum", karat: ".900", defaultPct: "90" },
};

const KARAT_PURITY: Record<Karat, number> = {
  "10k": 10/24, "12k": 12/24, "14k": 14/24, "18k": 18/24,
  "21k": 21/24, "22k": 22/24, "24k": 24/24,
  ".900": 0.900, ".925": 0.925, ".950": 0.950, ".999": 0.999,
};
const GOLD_KARATS:     Karat[] = ["10k","12k","14k","18k","21k","22k","24k"];
const SILVER_KARATS:   Karat[] = [".925", ".999"];
const PLATINUM_KARATS: Karat[] = [".900", ".950", ".999"];

interface Props { vendor: string; buyer: string; onAdd: (item: MetalCartItem) => void; }

export default function MetalsForm({ vendor, buyer, onAdd }: Props) {
  const [metalType, setMetalType] = useState<MetalType>("gold");
  const [category,  setCategory]  = useState<MetalCategory>("SG");
  const [karat,     setKarat]     = useState<Karat>("14k");
  const [grams,     setGrams]     = useState<string>("");
  const [pctOfSpot, setPctOfSpot] = useState<string>("90");
  const [pctInput,  setPctInput]  = useState<string>("90");

  const [liveSpot,   setLiveSpot]   = useState<number | null>(null);
  const [spotStatus, setSpotStatus] = useState<"loading" | "live" | "manual" | "error">("loading");
  const [manualSpot, setManualSpot] = useState<string>("");
  const [useManual,  setUseManual]  = useState(false);

  // Fetch spot price whenever metal type changes
  useEffect(() => {
    setLiveSpot(null);
    setSpotStatus("loading");
    setUseManual(false);
    fetch(METAL_CONFIG[metalType].apiRoute)
      .then((r) => r.json())
      .then((d) => {
        if (d.price) { setLiveSpot(d.price); setSpotStatus("live"); }
        else { setSpotStatus("error"); setUseManual(true); }
      })
      .catch(() => { setSpotStatus("error"); setUseManual(true); });
  }, [metalType]);

  // When switching metal type, reset karat to default (category stays)
  function switchMetal(type: MetalType) {
    setMetalType(type);
    setKarat(METAL_CONFIG[type].karat);
  }

  const spotPerOz  = useManual ? (parseFloat(manualSpot) || 0) : (liveSpot ?? 0);
  const gramsNum   = parseFloat(grams) || 0;
  const pct        = parseFloat(pctOfSpot) || 0;
  const purity     = KARAT_PURITY[karat];
  const metalLabel = METAL_CONFIG[metalType].label;

  const valuePerGram = spotPerOz > 0 ? spotPerOz * TROY_OZ_PER_GRAM * purity : 0;
  const totalValue   = valuePerGram * gramsNum;
  const wePayTotal   = totalValue * (pct / 100);
  const wePayPerGram = gramsNum > 0 ? wePayTotal / gramsNum : 0;

  const handleAdd = useCallback(() => {
    if (!vendor || gramsNum <= 0 || spotPerOz <= 0) return;
    onAdd({
      id: uid(), itemType: "metal", vendor, buyer, category, karat,
      grams: gramsNum, spotPerOz, pctOfSpot: pct,
      lineTotal: Math.round(wePayTotal * 100) / 100,
    });
  }, [vendor, buyer, category, karat, gramsNum, spotPerOz, pct, wePayTotal, onAdd]);

  return (
    <div className="space-y-4">

      {/* Metal type selector */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
        <label className="label">Metal</label>
        <div className="flex gap-2">
          {(["gold", "silver", "platinum"] as MetalType[]).map((t) => (
            <Chip key={t} label={METAL_CONFIG[t].label} active={metalType === t} onClick={() => switchMetal(t)} />
          ))}
        </div>
      </div>

      {/* Spot price */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <p className="label">{metalLabel} Spot</p>
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
            Pure {metalLabel.toLowerCase()}: {fmt(spotPerOz * TROY_OZ_PER_GRAM)}/g · purity: {(purity * 100).toFixed(metalType === "gold" ? 2 : 1)}%
          </p>
        )}
      </div>

      {/* Metal details */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">

        {/* Category — all metals */}
        <div className="space-y-2">
          <label className="label">Category</label>
          <div className="flex gap-2">
            <Chip label="Scrap"   active={category === "SG"} onClick={() => setCategory("SG")} />
            <Chip label="Removal" active={category === "RG"} onClick={() => setCategory("RG")} />
          </div>
        </div>

        {/* Karat / Purity */}
        <div className="space-y-2">
          <label className="label">{metalType === "gold" ? "Karat" : "Purity"}</label>
          <div className="flex flex-wrap gap-2">
            {metalType === "gold" && GOLD_KARATS.map((k) => (
              <Chip key={k} label={k} active={karat === k} onClick={() => setKarat(k)} />
            ))}
            {metalType === "silver" && SILVER_KARATS.map((k) => (
              <Chip key={k} label={k} active={karat === k} onClick={() => setKarat(k)} />
            ))}
            {metalType === "platinum" && PLATINUM_KARATS.map((k) => (
              <Chip key={k} label={k} active={karat === k} onClick={() => setKarat(k)} />
            ))}
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
          <div className="flex justify-between">
            <span className="text-zinc-500">{metalLabel} purity</span>
            <span>{(purity * 100).toFixed(metalType === "gold" ? 2 : 1)}% {metalType === "gold" ? `(${karat})` : `(${karat})`}</span>
          </div>
          <div className="flex justify-between"><span className="text-zinc-500">Pure {metalLabel.toLowerCase()} value</span><span>{fmt(totalValue)}</span></div>
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
