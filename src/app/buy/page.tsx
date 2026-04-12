"use client";

import { useState } from "react";
import type { CartItem, ParcelCartItem, SingleCartItem, MetalCartItem, CustomCartItem } from "@/lib/types";
// SingleCartItem.shape is now SingleShape (BR, PR, etc.) — no round/fancy mapping needed
import ParcelsForm from "@/components/ParcelsForm";
import SinglesForm from "@/components/SinglesForm";
import MetalsForm from "@/components/MetalsForm";
import CustomForm from "@/components/CustomForm";

type AppTab = "parcels" | "singles" | "metals" | "custom";

const VENDORS = ["Walk-in", "Estate buyer", "Dealer A", "Dealer B", "New vendor…"];

function fmtTotal(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function cartLabel(item: CartItem): string {
  if (item.itemType === "parcel") {
    const i = item as ParcelCartItem;
    return `${i.vendor} · ${i.shape === "round" ? "Rnd" : "Fcy"} ${i.sizeRange} ${i.colorBand} ${i.clarity} ×${i.qty}`;
  }
  if (item.itemType === "single") {
    const i = item as SingleCartItem;
    return `${i.vendor} · ${i.shape} ${i.weight}ct ${i.color} ${i.clarity} [${i.mode}]`;
  }
  if (item.itemType === "metal") {
    const i = item as MetalCartItem;
    return `${i.vendor} · ${i.category} ${i.karat} ${i.grams}g @ ${i.pctOfSpot}% (spot $${i.spotPerOz.toFixed(0)}/oz)`;
  }
  const i = item as CustomCartItem;
  return `${i.vendor} · ${i.description}`;
}

function cartDetail(item: CartItem): string {
  if (item.itemType === "parcel") {
    const i = item as ParcelCartItem;
    return `${i.qty} × $${i.pricePerCt}/ct × ${i.avgWeight}ct avg`;
  }
  if (item.itemType === "single") {
    const i = item as SingleCartItem;
    if (i.mode === "as-is") return `at ${i.asIsDiscountPct}% · cert $${i.certCost} · net`;
    if (i.mode === "recut") return `recut ${i.recutDiscountPct}% · ${i.recutLocation} · net`;
    return "";
  }
  if (item.itemType === "metal") {
    const i = item as MetalCartItem;
    return `spot $${i.spotPerOz.toFixed(2)}/oz · ${((i.pctOfSpot / 100) * (parseInt(i.karat) / 24) * 100).toFixed(1)}% pure paid`;
  }
  return "custom item";
}

export default function BuyPage() {
  const [tab, setTab] = useState<AppTab>("parcels");
  const [vendor, setVendor] = useState("Walk-in");
  const [customVendor, setCustomVendor] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const activeVendor = vendor === "New vendor…" ? customVendor.trim() : vendor;

  const addItem = (item: CartItem) => setCart((prev) => [...prev, item]);
  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));
  const screenTotal = cart.reduce((s, i) => s + (i.lineTotal ?? 0), 0);

  const tabs: { key: AppTab; label: string }[] = [
    { key: "parcels", label: "Parcels" },
    { key: "singles", label: "Singles" },
    { key: "metals", label: "Metals" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">

      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-0">
          <div className="flex justify-between items-baseline mb-2">
            <h1 className="text-lg font-semibold text-zinc-900">Diamond Buy</h1>
          </div>
          {/* Tab bar */}
          <div className="flex">
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors
                  ${tab === t.key ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Vendor */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
          <label className="label">Vendor</label>
          <select value={vendor} onChange={(e) => setVendor(e.target.value)}
            className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white">
            {VENDORS.map((v) => <option key={v}>{v}</option>)}
          </select>
          {vendor === "New vendor…" && (
            <input placeholder="Vendor name" value={customVendor}
              onChange={(e) => setCustomVendor(e.target.value)}
              className="input w-full" />
          )}
        </div>

        {/* Active form */}
        {tab === "parcels" && <ParcelsForm vendor={activeVendor} onAdd={(item) => addItem(item)} />}
        {tab === "singles" && <SinglesForm vendor={activeVendor} onAdd={(item) => addItem(item)} />}
        {tab === "metals" && <MetalsForm vendor={activeVendor} onAdd={(item) => addItem(item)} />}
        {tab === "custom" && <CustomForm vendor={activeVendor} onAdd={(item) => addItem(item)} />}

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
            <label className="label">Cart ({cart.length})</label>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm py-1 border-b border-zinc-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-800 truncate">{cartLabel(item)}</p>
                    <p className="text-zinc-400 text-xs">{cartDetail(item)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    <p className="font-semibold text-zinc-900">{fmtTotal(item.lineTotal)}</p>
                    <button type="button" onClick={() => removeItem(item.id)} className="text-zinc-300 hover:text-red-400 text-lg leading-none">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky total */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-4 py-4 z-10">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Screen Total</p>
            <p className="text-2xl font-bold text-zinc-900">{screenTotal > 0 ? fmtTotal(screenTotal) : "—"}</p>
          </div>
          {cart.length > 0 && (
            <button type="button" onClick={() => setCart([])} className="text-sm text-zinc-400 underline">Clear cart</button>
          )}
        </div>
      </div>
    </div>
  );
}
