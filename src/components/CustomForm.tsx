"use client";

import { useState } from "react";
import type { CustomCartItem } from "@/lib/types";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);

const ITEM_TYPES = ["Diamonds", "Metal", "Jewelry", "Colored Stone", "Lab Grown"];

interface Props { vendor: string; buyer: string; onAdd: (item: CustomCartItem) => void; }

type WeightUnit = "ct" | "g";
type LastEdited = "price" | "total";

export default function CustomForm({ vendor, buyer, onAdd }: Props) {
  const [selectedType, setSelectedType]     = useState("Diamonds");
  const [weightInput,  setWeightInput]      = useState("");
  const [weightUnit,   setWeightUnit]       = useState<WeightUnit>("ct");
  const [priceInput,   setPriceInput]       = useState("");
  const [totalInput,   setTotalInput]       = useState("");
  const [lastEdited,   setLastEdited]       = useState<LastEdited>("total");

  const weight    = parseFloat(weightInput) || 0;
  const priceNum  = parseFloat(priceInput)  || 0;
  const totalNum  = parseInt(totalInput.replace(/[^0-9]/g, "")) || 0;
  const lineTotal = lastEdited === "total" ? totalNum : (priceNum > 0 && weight > 0 ? Math.round(priceNum * weight) : 0);

  function handleWeightChange(val: string) {
    setWeightInput(val);
    const w = parseFloat(val) || 0;
    if (w <= 0) return;
    if (lastEdited === "price" && priceNum > 0) {
      setTotalInput(String(Math.round(priceNum * w)));
    } else if (lastEdited === "total" && totalNum > 0) {
      setPriceInput((totalNum / w).toFixed(2));
    }
  }

  function handlePriceChange(val: string) {
    setPriceInput(val);
    setLastEdited("price");
    const p = parseFloat(val) || 0;
    if (p > 0 && weight > 0) {
      setTotalInput(String(Math.round(p * weight)));
    }
  }

  function handleTotalChange(val: string) {
    const cleaned = val.replace(/[^0-9]/g, "");
    setTotalInput(cleaned);
    setLastEdited("total");
    const t = parseInt(cleaned) || 0;
    if (t > 0 && weight > 0) {
      setPriceInput((t / weight).toFixed(2));
    }
  }

  function switchUnit(unit: WeightUnit) {
    setWeightUnit(unit);
    setWeightInput("");
    setPriceInput("");
    setTotalInput("");
  }

  const canAdd = !!(vendor && lineTotal > 0);

  function handleAdd() {
    if (!canAdd) return;
    onAdd({
      id: uid(),
      itemType: "custom",
      vendor,
      buyer,
      description: selectedType,
      customItemType: selectedType,
      weight: weight > 0 ? weight : undefined,
      weightUnit: weight > 0 ? weightUnit : undefined,
      lineTotal,
    });
    setWeightInput("");
    setPriceInput("");
    setTotalInput("");
    setLastEdited("total");
  }

  const unitLabel = weightUnit === "ct" ? "ct" : "g";
  const priceLabel = weightUnit === "ct" ? "Price / ct" : "Price / g";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">

        {/* Item type */}
        <div className="space-y-2">
          <label className="label">Item Type</label>
          <div className="flex flex-wrap gap-2">
            {ITEM_TYPES.map((t) => (
              <Chip key={t} label={t} active={selectedType === t} onClick={() => setSelectedType(t)} />
            ))}
          </div>
        </div>

        {/* Weight + unit */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="label">Weight</label>
            <div className="flex gap-1">
              <button type="button" onClick={() => switchUnit("ct")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors
                  ${weightUnit === "ct" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                ct
              </button>
              <button type="button" onClick={() => switchUnit("g")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors
                  ${weightUnit === "g" ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                g
              </button>
            </div>
          </div>
          <input type="text" inputMode="decimal" value={weightInput}
            onChange={(e) => handleWeightChange(e.target.value)}
            className="input w-full" placeholder={`e.g. 2.50 ${unitLabel}`} />
        </div>

        {/* Price per unit + Total — always both visible, synced */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">{priceLabel} ($)</label>
            <input type="text" inputMode="decimal" value={priceInput}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="input w-full" placeholder="850" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Total ($)</label>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-sm">$</span>
              <input type="text" inputMode="numeric" value={totalInput}
                onChange={(e) => handleTotalChange(e.target.value)}
                className="input flex-1" placeholder="2125" />
            </div>
          </div>
        </div>

        {lineTotal > 0 && (
          <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
            <span className="text-sm text-zinc-500">{selectedType}</span>
            <span className="text-xl font-bold">${lineTotal.toLocaleString()}</span>
          </div>
        )}

        <button type="button" onClick={handleAdd} disabled={!canAdd}
          className="btn-primary w-full">Add to Cart</button>
      </div>
    </div>
  );
}
