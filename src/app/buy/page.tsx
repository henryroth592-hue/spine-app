"use client";

import { useState, useEffect } from "react";
import { compressImage } from "@/lib/imageUtils";
import type { CartItem, ParcelCartItem, SingleCartItem, MetalCartItem, CustomCartItem, MeleeCartItem, GemParcelCartItem, SingleGemCartItem, FJCartItem } from "@/lib/types";
import ParcelsForm from "@/components/ParcelsForm";
import SinglesForm from "@/components/SinglesForm";
import MetalsForm from "@/components/MetalsForm";
import CustomForm from "@/components/CustomForm";
import MeleeForm from "@/components/MeleeForm";
import GemForm from "@/components/GemForm";
import ReceiptModal from "@/components/ReceiptModal";

type AppTab = "melee" | "parcels" | "singles" | "metals" | "gems" | "custom";

const BUYERS = ["Henry", "Bert", "Ted", "Emma", "BDL", "DBR"];
const FJ_TYPES = ["Ring", "Necklace", "Bracelet", "Earrings", "Pendant", "Brooch", "Watch", "Other"];

interface Vendor {
  name: string;
  email: string;
  contactName?: string;
  title?: string;
  cell?: string;
  phone?: string;
  address?: string;
  website?: string;
  social?: string;
}

const DEFAULT_VENDORS: Vendor[] = [
  { name: "Walk-in",      email: "" },
  { name: "Estate buyer", email: "" },
  { name: "Dealer A",     email: "" },
  { name: "Dealer B",     email: "" },
];
const STORAGE_KEY = "spine_vendors_v4";

function fmtTotal(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function cartLabel(item: CartItem): string {
  const b = (item as { buyer?: string }).buyer ? ` [${(item as { buyer: string }).buyer}]` : "";
  if (item.itemType === "melee") {
    const i = item as MeleeCartItem;
    return `${i.vendor}${b} · ${i.group} ${i.assortmentLabel} ${i.sizeRange}`;
  }
  if (item.itemType === "parcel") {
    const i = item as ParcelCartItem;
    return `${i.vendor}${b} · ${i.shape === "round" ? "Rnd" : "Fcy"} ${i.sizeRange} ${i.colorBand} ${i.clarity} ×${i.qty}`;
  }
  if (item.itemType === "single") {
    const i = item as SingleCartItem;
    return `${i.vendor}${b} · ${i.shape} ${i.weight}ct ${i.color} ${i.clarity} [${i.mode}]`;
  }
  if (item.itemType === "metal") {
    const i = item as MetalCartItem;
    return `${i.vendor}${b} · ${i.category} ${i.karat} ${i.grams}g @ ${i.pctOfSpot}% (spot $${i.spotPerOz.toFixed(0)}/oz)`;
  }
  if (item.itemType === "gem-parcel") {
    const i = item as GemParcelCartItem;
    return `${i.vendor}${b} · Gem Parcel – ${i.gemType} ${i.weight}ct`;
  }
  if (item.itemType === "single-gem") {
    const i = item as SingleGemCartItem;
    return `${i.vendor}${b} · Single Gem – ${i.gemType} ${i.weight}ct`;
  }
  if (item.itemType === "fj") {
    const i = item as FJCartItem;
    return `${i.vendor}${b} · FJ – ${i.fjName} (${i.jewelryType})`;
  }
  const i = item as CustomCartItem;
  return `${i.vendor}${b} · ${i.description}`;
}

function cartDetail(item: CartItem): string {
  if (item.itemType === "melee") {
    const i = item as MeleeCartItem;
    return `$${i.pricePerCt}/ct × ${i.weight}ct`;
  }
  if (item.itemType === "gem-parcel" || item.itemType === "single-gem") {
    const i = item as GemParcelCartItem;
    return `$${i.pricePerCt}/ct × ${i.weight}ct`;
  }
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
  if (item.itemType === "fj") {
    const i = item as FJCartItem;
    return `${i.components.length} component${i.components.length !== 1 ? "s" : ""}`;
  }
  return "custom item";
}

export default function BuyPage() {
  const [step,          setStep]          = useState<1 | 2>(1);
  const [tab,           setTab]           = useState<AppTab>("melee");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [fjMode,       setFjMode]       = useState(false);
  const [fjName,       setFjName]       = useState("");
  const [fjType,       setFjType]       = useState("Ring");
  const [fjComponents, setFjComponents] = useState<CartItem[]>([]);

  // ── Vendor management (localStorage) ──────────────────────────────────────
  const [vendors, setVendors] = useState<Vendor[]>(DEFAULT_VENDORS);
  const [selectedVendor, setSelectedVendor] = useState<string>("Walk-in");
  const [newName,        setNewName]        = useState("");
  const [newEmail,       setNewEmail]       = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newTitle,       setNewTitle]       = useState("");
  const [newCell,        setNewCell]        = useState("");
  const [newPhone,       setNewPhone]       = useState("");
  const [newAddress,     setNewAddress]     = useState("");
  const [newWebsite,     setNewWebsite]     = useState("");
  const [newSocial,      setNewSocial]      = useState("");
  const [managingVendors, setManagingVendors] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setVendors(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  function persist(updated: Vendor[]) {
    setVendors(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addVendor() {
    const name = newName.trim();
    const email = newEmail.trim();
    if (!name || vendors.find((v) => v.name === name)) return;
    const v: Vendor = {
      name,
      email,
      ...(newContactName.trim() && { contactName: newContactName.trim() }),
      ...(newTitle.trim()       && { title:       newTitle.trim() }),
      ...(newCell.trim()        && { cell:         newCell.trim() }),
      ...(newPhone.trim()       && { phone:        newPhone.trim() }),
      ...(newAddress.trim()     && { address:      newAddress.trim() }),
      ...(newWebsite.trim()     && { website:      newWebsite.trim() }),
      ...(newSocial.trim()      && { social:       newSocial.trim() }),
    };
    const updated = [...vendors, v];
    persist(updated);
    setSelectedVendor(name);
    setNewName(""); setNewEmail(""); setNewContactName(""); setNewTitle("");
    setNewCell(""); setNewPhone(""); setNewAddress(""); setNewWebsite(""); setNewSocial("");
    setManagingVendors(false);
  }

  async function handleScanCard(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const base64 = await compressImage(file);
      const mediaType = "image/jpeg";

      const res = await fetch("/api/scan-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });

      // Surface the raw response if it isn't JSON
      if (!res.ok) {
        const raw = await res.text();
        throw new Error(`Server error ${res.status}: ${raw.slice(0, 200)}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.company) setNewName(data.company);
      else if (data.name) setNewName(data.name);
      if (data.name && data.company) setNewContactName(data.name);
      if (data.title)   setNewTitle(data.title);
      if (data.email)   setNewEmail(data.email);
      if (data.cell)    setNewCell(data.cell);
      if (data.phone)   setNewPhone(data.phone);
      if (data.address) setNewAddress(data.address);
      if (data.website) setNewWebsite(data.website);
      if (data.social)  setNewSocial(data.social);
    } catch (err) {
      alert("Could not read card: " + String(err));
    } finally {
      setScanning(false);
      e.target.value = "";
    }
  }

  function updateEmail(name: string, email: string) {
    persist(vendors.map((v) => v.name === name ? { ...v, email } : v));
  }

  function removeVendor(name: string) {
    const updated = vendors.filter((v) => v.name !== name);
    persist(updated);
    if (selectedVendor === name) setSelectedVendor(updated[0]?.name ?? "");
  }

  const activeVendor = vendors.find((v) => v.name === selectedVendor);

  // ── Cart ───────────────────────────────────────────────────────────────────
  const addItem = (item: CartItem) => {
    if (fjMode) {
      setFjComponents((prev) => [...prev, item]);
    } else {
      setCart((prev) => [...prev, item]);
    }
  };
  const removeItem = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));
  const removeComponent = (id: string) => setFjComponents((prev) => prev.filter((i) => i.id !== id));
  const screenTotal = cart.reduce((s, i) => s + (i.lineTotal ?? 0), 0);

  const [vendorAsk, setVendorAsk] = useState("");
  const vendorAskNum = parseFloat(vendorAsk.replace(/[$,]/g, "")) || 0;
  const askDelta = vendorAskNum > 0 ? vendorAskNum - screenTotal : 0;

  function applyVendorAsk() {
    if (!vendorAskNum || vendorAskNum === screenTotal || screenTotal === 0) return;
    const ratio = vendorAskNum / screenTotal;
    setCart((prev) => prev.map((item): CartItem => {
      if (item.itemType === "fj") {
        return {
          ...item,
          lineTotal: item.lineTotal * ratio,
          components: item.components.map((c) => ({ ...c, lineTotal: c.lineTotal * ratio })),
        };
      }
      return { ...item, lineTotal: item.lineTotal * ratio };
    }));
    setVendorAsk("");
  }

  function completeFJ() {
    if (!fjName.trim() || fjComponents.length === 0) return;
    const fj: FJCartItem = {
      id: crypto.randomUUID(),
      itemType: "fj",
      vendor: selectedVendor,
      buyer: selectedBuyer,
      fjName: fjName.trim(),
      jewelryType: fjType,
      components: [...fjComponents],
      lineTotal: fjComponents.reduce((s, c) => s + c.lineTotal, 0),
    };
    setCart((prev) => [...prev, fj]);
    setFjComponents([]);
    setFjName("");
    setFjMode(false);
  }

  const tabs: { key: AppTab; label: string }[] = [
    { key: "melee",   label: "Melee"   },
    { key: "parcels", label: "Mediums" },
    { key: "singles", label: "Singles" },
    { key: "metals",  label: "Metals"  },
    { key: "gems",    label: "Gems"    },
    { key: "custom",  label: "Custom"  },
  ];

  const canProceed = selectedBuyer !== "";

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">

      {/* ── STEP 1: Vendor + Buyer ── */}
      {step === 1 && (
        <>
          <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
            <div className="max-w-lg mx-auto px-4 py-3">
              <h1 className="text-lg font-semibold text-zinc-900">Diamond Buy</h1>
              <p className="text-xs text-zinc-400">Step 1 of 2 — Vendor & Buyer</p>
            </div>
          </div>

          <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

            {/* Vendor */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="label">Vendor</label>
                <button type="button" onClick={() => { setManagingVendors((v) => !v); setEditingEmail(null); }}
                  className="text-xs text-zinc-400 underline">
                  {managingVendors ? "Done" : "Manage"}
                </button>
              </div>

              {managingVendors ? (
                <div className="space-y-3">
                  {vendors.map((v) => (
                    <div key={v.name} className="space-y-0.5 py-1 border-b border-zinc-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-700">{v.name}</span>
                        <button type="button" onClick={() => removeVendor(v.name)}
                          className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                      {v.contactName && <p className="text-xs text-zinc-500">{v.contactName}{v.title ? ` · ${v.title}` : ""}</p>}
                      {v.email   && <p className="text-xs text-zinc-400">{v.email}</p>}
                      {v.cell    && <p className="text-xs text-zinc-400">Cell: {v.cell}</p>}
                      {v.phone   && <p className="text-xs text-zinc-400">Tel: {v.phone}</p>}
                      {v.address && <p className="text-xs text-zinc-400">{v.address}</p>}
                      {v.website && <p className="text-xs text-zinc-400">{v.website}</p>}
                      {v.social  && <p className="text-xs text-zinc-400">{v.social}</p>}
                    </div>
                  ))}
                  <div className="pt-3 border-t border-zinc-100 space-y-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Add Vendor</p>
                    <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-zinc-300 rounded-xl py-3 text-sm text-zinc-500 cursor-pointer hover:border-zinc-400 transition-colors ${scanning ? "opacity-50 pointer-events-none" : ""}`}>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanCard} disabled={scanning} />
                      {scanning ? "Scanning…" : "📷  Scan Business Card"}
                    </label>
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                      className="input w-full" placeholder="Company / vendor name *" />
                    <input type="email" inputMode="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                      className="input w-full" placeholder="Email (recommended)" />
                    <input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)}
                      className="input w-full" placeholder="Contact name" />
                    <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                      className="input w-full" placeholder="Title" />
                    <input type="tel" inputMode="tel" value={newCell} onChange={(e) => setNewCell(e.target.value)}
                      className="input w-full" placeholder="Cell" />
                    <input type="tel" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                      className="input w-full" placeholder="Office phone" />
                    <input type="text" value={newAddress} onChange={(e) => setNewAddress(e.target.value)}
                      className="input w-full" placeholder="Address" />
                    <input type="url" inputMode="url" value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)}
                      className="input w-full" placeholder="Website" />
                    <input type="text" value={newSocial} onChange={(e) => setNewSocial(e.target.value)}
                      className="input w-full" placeholder="Social media" />
                    <button type="button" onClick={addVendor} disabled={!newName.trim()}
                      className="btn-primary w-full">Add Vendor</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <select value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)}
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white">
                    {vendors.map((v) => <option key={v.name}>{v.name}</option>)}
                  </select>
                  {(activeVendor?.email || activeVendor?.cell || activeVendor?.phone) && (
                    <p className="text-xs text-zinc-400">
                      {[activeVendor.email, activeVendor.cell ?? activeVendor.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Buyer */}
            <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
              <label className="label">Buyer</label>
              <div className="flex flex-wrap gap-2">
                {BUYERS.map((b) => (
                  <button key={b} type="button"
                    onClick={() => setSelectedBuyer(b)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                      ${selectedBuyer === b
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400"}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 1 footer */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-4 py-4 z-10">
            <div className="max-w-lg mx-auto">
              <button type="button"
                disabled={!canProceed}
                onClick={() => setStep(2)}
                className="btn-primary w-full disabled:opacity-40">
                Continue →
              </button>
              {!canProceed && <p className="text-xs text-center text-zinc-400 mt-2">Select a buyer to continue</p>}
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2: Add items ── */}
      {step === 2 && (
        <>
          {/* Header with tabs */}
          <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
            <div className="max-w-lg mx-auto px-4 pt-3 pb-0">
              {/* Vendor/buyer bar */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-zinc-700 font-medium">
                  {selectedVendor}
                  <span className="text-zinc-400 mx-1.5">·</span>
                  <span className="text-zinc-500">{selectedBuyer}</span>
                </div>
                <button type="button"
                  onClick={() => { if (cart.length === 0) setStep(1); }}
                  className={`text-xs underline ${cart.length === 0 ? "text-zinc-400" : "text-zinc-300 cursor-not-allowed"}`}>
                  {cart.length === 0 ? "Edit" : "Locked"}
                </button>
              </div>
              {/* FJ mode toggle */}
              <div className="flex gap-1 mb-1 bg-zinc-100 rounded-lg p-0.5">
                <button type="button" onClick={() => setFjMode(false)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors
                    ${!fjMode ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"}`}>
                  Items
                </button>
                <button type="button" onClick={() => setFjMode(true)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors
                    ${fjMode ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"}`}>
                  Finished Jewelry
                </button>
              </div>
              {/* Tabs */}
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

            {/* FJ name + type */}
            {fjMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Finished Jewelry</p>
                <div className="flex gap-2">
                  <input type="text" value={fjName} onChange={(e) => setFjName(e.target.value)}
                    className="input flex-1" placeholder="Piece name (e.g. 2ct solitaire ring)" />
                  <select value={fjType} onChange={(e) => setFjType(e.target.value)}
                    className="border border-zinc-300 rounded-lg px-2 py-2 text-sm text-zinc-900 bg-white">
                    {FJ_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <p className="text-xs text-amber-700">Use the tabs below to add components</p>
              </div>
            )}

            {/* Active form */}
            {tab === "melee"   && <MeleeForm   vendor={selectedVendor} buyer={selectedBuyer} onAdd={addItem} />}
            {tab === "parcels" && <ParcelsForm vendor={selectedVendor} buyer={selectedBuyer} onAdd={addItem} />}
            {tab === "singles" && <SinglesForm vendor={selectedVendor} buyer={selectedBuyer} onAdd={addItem} />}
            {tab === "metals"  && <MetalsForm  vendor={selectedVendor} buyer={selectedBuyer} onAdd={addItem} />}
            {tab === "gems"    && <GemForm     vendor={selectedVendor} buyer={selectedBuyer} onAdd={addItem} />}
            {tab === "custom"  && <CustomForm  vendor={selectedVendor} buyer={selectedBuyer} onAdd={addItem} />}

            {/* FJ component staging */}
            {fjMode && (
              <div className="bg-white rounded-xl border border-amber-300 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="label">{fjName.trim() ? `${fjName} – Components` : "Components"}</label>
                  <span className="text-xs font-semibold text-zinc-600">
                    {fjComponents.length > 0 ? fmtTotal(fjComponents.reduce((s, i) => s + i.lineTotal, 0)) : "—"}
                  </span>
                </div>
                {fjComponents.length === 0 ? (
                  <p className="text-sm text-zinc-400">No components added yet</p>
                ) : (
                  <div className="space-y-2">
                    {fjComponents.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-sm py-1 border-b border-zinc-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-800 truncate">{cartLabel(item)}</p>
                          <p className="text-zinc-400 text-xs">{cartDetail(item)}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          <p className="font-semibold text-zinc-900">{fmtTotal(item.lineTotal)}</p>
                          <button type="button" onClick={() => removeComponent(item.id)}
                            className="text-zinc-300 hover:text-red-400 text-lg leading-none">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={completeFJ}
                  disabled={!fjName.trim() || fjComponents.length === 0}
                  className="btn-primary w-full disabled:opacity-40">
                  Complete FJ →
                </button>
              </div>
            )}

            {/* Cart */}
            {cart.length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="label">Cart ({cart.length})</label>
                  <button type="button" onClick={() => setShowReceipt(true)}
                    className="text-xs text-zinc-500 underline">Receipt</button>
                </div>
                <div className="space-y-2">
                  {cart.map((item) => {
                    if (item.itemType === "fj") {
                      const fj = item as FJCartItem;
                      return (
                        <div key={fj.id} className="py-1 border-b border-zinc-100 last:border-0">
                          <div className="flex justify-between items-start text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-zinc-800">{fj.fjName}</p>
                              <p className="text-zinc-400 text-xs">{fj.jewelryType} · {fj.components.length} components</p>
                            </div>
                            <div className="flex items-center gap-3 ml-2 shrink-0">
                              <p className="font-semibold text-zinc-900">{fmtTotal(fj.lineTotal)}</p>
                              <button type="button" onClick={() => removeItem(fj.id)}
                                className="text-zinc-300 hover:text-red-400 text-lg leading-none">×</button>
                            </div>
                          </div>
                          <div className="pl-3 mt-1 space-y-0.5">
                            {fj.components.map((c) => (
                              <div key={c.id} className="flex justify-between text-xs text-zinc-500">
                                <span className="truncate">{cartLabel(c)}</span>
                                <span className="ml-2 shrink-0">{fmtTotal(c.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
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
                    );
                  })}
                </div>

                {/* Vendor adjustment */}
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <p className="text-xs text-zinc-400">Vendor&apos;s ask — leave blank if accepted at calc total</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vendorAsk}
                      onChange={(e) => setVendorAsk(e.target.value)}
                      className="input flex-1"
                      placeholder={`Calc: ${fmtTotal(screenTotal)}`}
                    />
                    <button type="button" onClick={applyVendorAsk}
                      disabled={!vendorAskNum || vendorAskNum === screenTotal}
                      className="btn-primary px-4 disabled:opacity-40">
                      Prorate
                    </button>
                  </div>
                  {vendorAskNum > 0 && vendorAskNum !== screenTotal && (
                    <p className="text-xs text-zinc-500">
                      {askDelta > 0 ? "+" : ""}{fmtTotal(askDelta)} distributed across {cart.length} item{cart.length !== 1 ? "s" : ""} proportionally
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2 sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-4 py-4 z-10">
            <div className="max-w-lg mx-auto flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-zinc-900">{screenTotal > 0 ? fmtTotal(screenTotal) : "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button type="button" onClick={() => setShowReceipt(true)}
                    className="btn-primary px-4">Receipt</button>
                )}
                {cart.length > 0 && (
                  <button type="button" onClick={() => { setCart([]); setStep(1); setSelectedBuyer(""); }}
                    className="text-sm text-zinc-400 underline">New</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Receipt modal */}
      {showReceipt && (
        <ReceiptModal
          vendor={selectedVendor}
          vendorEmail={activeVendor?.email}
          cart={cart}
          screenTotal={screenTotal}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </div>
  );
}
