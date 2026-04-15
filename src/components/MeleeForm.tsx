"use client";

import { useState } from "react";
import type { MeleeCartItem } from "@/lib/types";
import meleeData from "@/data/melee_prices.json";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

interface Assortment {
  group: string;
  key: string;
  label: string;
  prices: Record<string, number>;
}

const ASSORTMENTS = meleeData.assortments as Assortment[];
const SIZE_RANGES = meleeData.sizeRanges;

// Unique groups in order
const GROUPS = ASSORTMENTS.reduce<string[]>((acc, a) => {
  if (!acc.includes(a.group)) acc.push(a.group);
  return acc;
}, []);

interface Props { vendor: string; onAdd: (item: MeleeCartItem) => void; }

export default function MeleeForm({ vendor, onAdd }: Props) {
  const [selectedKey,    setSelectedKey]    = useState<string>(ASSORTMENTS[0].key);
  const [sizeRange,      setSizeRange]      = useState<string>(SIZE_RANGES[1]);
  const [weightInput,    setWeightInput]    = useState("");
  const [priceOverride,  setPriceOverride]  = useState("");
  const [totalOverride,  setTotalOverride]  = useState("");

  const assortment    = ASSORTMENTS.find((a) => a.key === selectedKey) ?? ASSORTMENTS[0];
  const sheetPrice    = assortment.prices[sizeRange] ?? null;
  const effectivePrice = priceOverride !== "" ? (parseFloat(priceOverride) || null) : sheetPrice;
  const weight        = parseFloat(weightInput) || 0;
  const calcTotal     = effectivePrice !== null && weight > 0 ? Math.round(effectivePrice * weight) : null;
  const lineTotal     = totalOverride !== ""
    ? (parseInt(totalOverride.replace(/[^0-9-]/g, "")) || 0)
    : calcTotal;

  function handleAdd() {
    if (!vendor || effectivePrice === null || weight <= 0 || lineTotal === null) return;
    onAdd({
      id: uid(),
      itemType: "melee",
      vendor,
      group: assortment.group,
      assortmentKey: assortment.key,
      assortmentLabel: assortment.label,
      sizeRange,
      pricePerCt: effectivePrice,
      weight,
      lineTotal,
    });
    setWeightInput("");
    setPriceOverride("");
    setTotalOverride("");
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400 text-right">Prices updated {meleeData.updatedAt}</p>

      {/* Assortment picker */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
        {GROUPS.map((group) => (
          <div key={group} className="space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{group}</p>
            <div className="flex flex-wrap gap-2">
              {ASSORTMENTS.filter((a) => a.group === group).map((a) => (
                <Chip
                  key={a.key}
                  label={a.label}
                  active={selectedKey === a.key}
                  onClick={() => setSelectedKey(a.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Size + weight + pricing */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
        <div className="space-y-2">
          <label className="label">Sieve size</label>
          <div className="flex flex-wrap gap-2">
            {SIZE_RANGES.map((sr) => (
              <Chip key={sr} label={sr} active={sizeRange === sr} onClick={() => setSizeRange(sr)} />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="label">Weight (ct)</label>
          <input
            type="text" inputMode="decimal" value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            className="input w-full" placeholder="e.g. 3.50"
          />
        </div>

        {/* Price summary */}
        <div className="pt-2 border-t border-zinc-100 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-zinc-400">
                Per carat{priceOverride !== "" ? " (override)" : sheetPrice !== null ? " (sheet)" : ""}
              </p>
              <p className="text-xl font-bold text-zinc-900">
                {effectivePrice !== null ? `$${effectivePrice}` : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">{weight > 0 ? `${weight}ct` : "—"}</p>
              <p className="text-xl font-bold text-zinc-900">
                {lineTotal !== null ? fmt(lineTotal) : "—"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">$/ct override</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">$</span>
              <input
                type="text" inputMode="decimal" value={priceOverride}
                onChange={(e) => { setPriceOverride(e.target.value); setTotalOverride(""); }}
                placeholder={sheetPrice !== null ? String(sheetPrice) : ""}
                className="input flex-1"
              />
              {priceOverride && (
                <button type="button" onClick={() => setPriceOverride("")}
                  className="text-xs text-zinc-400 underline shrink-0">clear</button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Total override</label>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">$</span>
              <input
                type="text" inputMode="numeric" value={totalOverride}
                onChange={(e) => { setTotalOverride(e.target.value); setPriceOverride(""); }}
                placeholder={calcTotal != null ? String(calcTotal) : ""}
                className="input flex-1"
              />
              {totalOverride && (
                <button type="button" onClick={() => setTotalOverride("")}
                  className="text-xs text-zinc-400 underline shrink-0">clear</button>
              )}
            </div>
          </div>
        </div>

        <button type="button" onClick={handleAdd}
          disabled={!vendor || effectivePrice === null || weight <= 0}
          className="btn-primary w-full">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
