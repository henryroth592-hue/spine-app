"use client";

import { useState } from "react";
import type { CustomCartItem } from "@/lib/types";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);

interface Props { vendor: string; onAdd: (item: CustomCartItem) => void; }

type EntryMode = "total" | "per-ct";

export default function CustomForm({ vendor, onAdd }: Props) {
  const [description, setDescription] = useState("");
  const [entryMode, setEntryMode] = useState<EntryMode>("total");
  const [totalInput, setTotalInput] = useState("");
  const [pricePerCtInput, setPricePerCtInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  const pricePerCt = parseFloat(pricePerCtInput) || 0;
  const weight = parseFloat(weightInput) || 0;

  const lineTotal = entryMode === "total"
    ? (parseInt(totalInput.replace(/[^0-9]/g, "")) || 0)
    : (pricePerCt > 0 && weight > 0 ? Math.round(pricePerCt * weight) : 0);

  const canAdd = vendor && description.trim() && lineTotal > 0;

  function handleAdd() {
    if (!canAdd) return;
    onAdd({ id: uid(), itemType: "custom", vendor, description: description.trim(), lineTotal });
    setDescription("");
    setTotalInput("");
    setPricePerCtInput("");
    setWeightInput("");
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">

        <div className="space-y-1">
          <label className="label">Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="input w-full" placeholder="e.g. Broken brooch, 18k ring, mixed lot…" />
        </div>

        <div className="space-y-2">
          <label className="label">Entry mode</label>
          <div className="flex gap-2">
            <Chip label="Total $" active={entryMode === "total"} onClick={() => setEntryMode("total")} />
            <Chip label="$/ct × weight" active={entryMode === "per-ct"} onClick={() => setEntryMode("per-ct")} />
          </div>
        </div>

        {entryMode === "total" ? (
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Total amount ($)</label>
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 text-sm">$</span>
              <input type="text" inputMode="numeric" value={totalInput}
                onChange={(e) => setTotalInput(e.target.value)}
                className="input flex-1" placeholder="1500" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Price per ct ($)</label>
              <input type="text" inputMode="decimal" value={pricePerCtInput}
                onChange={(e) => setPricePerCtInput(e.target.value)}
                className="input w-full" placeholder="850" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Weight (ct)</label>
              <input type="text" inputMode="decimal" value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="input w-full" placeholder="2.50" />
            </div>
          </div>
        )}

        {lineTotal > 0 && (
          <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
            <span className="text-sm text-zinc-500">Total</span>
            <span className="text-xl font-bold">${lineTotal.toLocaleString()}</span>
          </div>
        )}

        <button type="button" onClick={handleAdd} disabled={!canAdd}
          className="btn-primary w-full">Add to Cart</button>
      </div>
    </div>
  );
}
