"use client";

import { useState, useEffect } from "react";
import type { CartItem, ParcelCartItem, SingleCartItem, MetalCartItem, CustomCartItem } from "@/lib/types";
import ParcelsForm from "@/components/ParcelsForm";
import SinglesForm from "@/components/SinglesForm";
import MetalsForm from "@/components/MetalsForm";
import CustomForm from "@/components/CustomForm";
import ReceiptModal from "@/components/ReceiptModal";

type AppTab = "parcels" | "singles" | "metals" | "custom";

const DEFAULT_VENDORS = ["Walk-in", "Estate buyer", "Dealer A", "Dealer B"];
const STORAGE_KEY = "spine_vendors";

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
    if (i.mode === "as-is") return `at ${i.asIsDiscountPct?.toFixed(1)}% · cert $${i.certCost} · net`;
    if (i.mode === "recut") return `recut ${i.recutDiscountPct?.toFixed(1)}% · ${i.recutLocation} · net`;
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  // ── Vendor management (localStorage) ──────────────────────────────────────
  const [vendors, setVendors] = useState<string[]>(DEFAULT_VENDORS);
  const [vendor, setVendor] = useState("Walk-in");
  const [newVendorInput, setNewVendorInput] = useState("");
  const [managingVendors, setManagingVendors] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setVendors(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  function saveVendors(updated: string[]) {
    setVendors(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addVendor() {
    const name = newVendorInput.trim();
    if (!name || vendors.includes(name)) return;
    const updated = [...vendors, name];
    saveVendors(updated);
    setVendor(name);
    setNewVendorInput("");
  }

  function removeVendor(name: string) {
    const updated = vendors.filter((v) => v !== name);
    saveVendors(updated);
    if (vendor === name) setVendor(updated[0] ?? "");
  }

  // ── Cart ───────────────────────────────────────────────────────────────────
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
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <label className="label">Vendor</label>
            <button type="button" onClick={() => setManagingVendors((v) => !v)}
              className="text-xs text-zinc-400 underline">
              {managingVendors ? "Done" : "Manage"}
            </button>
          </div>

          {managingVendors ? (
            <div className="space-y-2">
              {vendors.map((v) => (
                <div key={v} className="flex items-center justify-between py-1">
                  <span className="text-sm text-zinc-700">{v}</span>
                  <button type="button" onClick={() => removeVendor(v)}
                    className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input type="text" value={newVendorInput}
                  onChange={(e) => setNewVendorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addVendor()}
                  className="input flex-1" placeholder="New vendor name" />
                <button type="button" onClick={addVendor}
                  disabled={!newVendorInput.trim()}
                  className="btn-primary px-4 shrink-0">Add</button>
              </div>
            </div>
          ) : (
            <select value={vendor} onChange={(e) => setVendor(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white">
              {vendors.map((v) => <option key={v}>{v}</option>)}
            </select>
          )}
        </div>

        {/* Active form */}
        {tab === "parcels" && <ParcelsForm vendor={vendor} onAdd={addItem} />}
        {tab === "singles" && <SinglesForm vendor={vendor} onAdd={addItem} />}
        {tab === "metals"  && <MetalsForm  vendor={vendor} onAdd={addItem} />}
        {tab === "custom"  && <CustomForm  vendor={vendor} onAdd={addItem} />}

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="label">Cart ({cart.length})</label>
              <button type="button" onClick={() => setShowReceipt(true)}
                className="text-xs text-zinc-500 underline">Receipt</button>
            </div>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm py-1 border-b border-zinc-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-800 truncate">{cartLabel(item)}</p>
                    <p className="text-zinc-400 text-xs">{cartDetail(item)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    <p className="font-semibold text-zinc-900">{fmtTotal(item.lineTotal)}</p>
                    <button type="button" onClick={() => removeItem(item.id)}
                      className="text-zinc-300 hover:text-red-400 text-lg leading-none">×</button>
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
          <div className="flex items-center gap-3">
            {cart.length > 0 && (
              <button type="button" onClick={() => setShowReceipt(true)}
                className="btn-primary px-4">Receipt</button>
            )}
            {cart.length > 0 && (
              <button type="button" onClick={() => setCart([])} className="text-sm text-zinc-400 underline">Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {showReceipt && (
        <ReceiptModal
          vendor={vendor}
          cart={cart}
          screenTotal={screenTotal}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
