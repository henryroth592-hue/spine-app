"use client";

import { useState } from "react";
import type { MeleeCartItem } from "@/lib/types";
import meleeData from "@/data/melee_prices.json";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const fmtPc = (n: number) => `$${Math.round(n)}`;

interface Assortment {
  group: string;
  key: string;
  label: string;
  prices: Record<string, number>;
}

const ASSORTMENTS = meleeData.assortments as Assortment[];
const SIZE_RANGES = meleeData.sizeRanges;

const GROUPS = ASSORTMENTS.reduce<string[]>((acc, a) => {
  if (!acc.includes(a.group)) acc.push(a.group);
  return acc;
}, []);

// ── Sample grader group definitions ──────────────────────────────────────────
const SAMPLE_GROUPS = [
  {
    key:   "cream",
    label: "Cream",
    desc:  "J+ SI2+ rounds & fancies",
    keys:  ["rnd_wh_si2", "fcy_wh_si2"],
  },
  {
    key:   "mid",
    label: "Mid",
    desc:  "J+ I1-2, TLC SI2+, TLB SI2+, Light NATS, SC WH SI2+, PR&Bags WH SI2+",
    keys:  ["rnd_wh_i1", "fcy_wh_i1", "rnd_tlc_si2", "fcy_tlc_si2",
            "rnd_tlb_si2", "rnd_nats_light", "sc_wh_si2", "pr_wh_si2"],
  },
  {
    key:   "low",
    label: "Low",
    desc:  "TLB I1-2, Dark NATS, I3, SC WH I1-2, PR&Bags WH I1-2",
    keys:  ["rnd_tlb_i1", "rnd_nats_dark", "fcy_nats_dark",
            "rnd_i3", "fcy_i3", "sc_wh_i1", "pr_wh_i1"],
  },
  {
    key:   "junk",
    label: "Junk",
    desc:  "Bullets, irradiated",
    keys:  ["rnd_bullets", "fcy_bullets", "rnd_irr_other", "fcy_irr_other",
            "rnd_irr_black", "fcy_irr_black"],
  },
] as const;

type SampleKey = typeof SAMPLE_GROUPS[number]["key"];

/** Average price of a set of assortment keys at a given sieve size */
function blendedPrice(keys: readonly string[], sizeRange: string): number | null {
  const prices = keys
    .map((k) => ASSORTMENTS.find((a) => a.key === k)?.prices[sizeRange])
    .filter((p): p is number => p !== undefined);
  if (!prices.length) return null;
  return Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
}

interface Props { vendor: string; onAdd: (item: MeleeCartItem) => void; }

export default function MeleeForm({ vendor, onAdd }: Props) {
  // ── Standard mode state ───────────────────────────────────────────────────
  const [selectedKey,   setSelectedKey]   = useState<string>(ASSORTMENTS[0].key);
  const [sizeRange,     setSizeRange]     = useState<string>(SIZE_RANGES[1]);
  const [weightInput,   setWeightInput]   = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [totalOverride, setTotalOverride] = useState("");

  // ── Sample grader state ───────────────────────────────────────────────────
  const [sampleMode,          setSampleMode]          = useState(false);
  const [parcelWeight,        setParcelWeight]        = useState("");
  const [sampleWeights,       setSampleWeights]       = useState<Record<SampleKey, string>>({
    cream: "", mid: "", low: "", junk: "",
  });
  const [samplePriceOverrides, setSamplePriceOverrides] = useState<Record<SampleKey, string>>({
    cream: "", mid: "", low: "", junk: "",
  });

  // ── Standard mode derived ─────────────────────────────────────────────────
  const assortment     = ASSORTMENTS.find((a) => a.key === selectedKey) ?? ASSORTMENTS[0];
  const sheetPrice     = assortment.prices[sizeRange] ?? null;
  const effectivePrice = priceOverride !== "" ? (parseFloat(priceOverride) || null) : sheetPrice;
  const weight         = parseFloat(weightInput) || 0;
  const calcTotal      = effectivePrice !== null && weight > 0 ? Math.round(effectivePrice * weight) : null;
  const lineTotal      = totalOverride !== ""
    ? (parseInt(totalOverride.replace(/[^0-9-]/g, "")) || 0)
    : calcTotal;

  // ── Sample grader derived ─────────────────────────────────────────────────
  const fullParcelWt = parseFloat(parcelWeight) || 0;

  const sampleCalc = SAMPLE_GROUPS.map((g) => {
    const bp       = blendedPrice(g.keys, sizeRange);
    const override = samplePriceOverrides[g.key];
    const effectiveBp = override !== "" ? (parseFloat(override) || null) : bp;
    const wt  = parseFloat(sampleWeights[g.key]) || 0;
    const val = effectiveBp !== null && wt > 0 ? effectiveBp * wt : 0;
    return { ...g, blendedPrice: bp, effectiveBp, wt, val };
  });

  const sampleTotalWt  = sampleCalc.reduce((s, g) => s + g.wt, 0);
  const sampleTotalVal = sampleCalc.reduce((s, g) => s + g.val, 0);
  const sampleAvgPc    = sampleTotalWt > 0 ? sampleTotalVal / sampleTotalWt : null;
  const extrapolated   = sampleAvgPc !== null && fullParcelWt > 0
    ? Math.round(sampleAvgPc * fullParcelWt) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!vendor) return;
    if (sampleMode) {
      if (sampleAvgPc === null || fullParcelWt <= 0 || extrapolated === null) return;
      onAdd({
        id: uid(), itemType: "melee", vendor,
        group: "Mix", assortmentKey: "mix_sample",
        assortmentLabel: "Mix (sample graded)",
        sizeRange, pricePerCt: Math.round(sampleAvgPc),
        weight: fullParcelWt, lineTotal: extrapolated,
      });
      setParcelWeight("");
      setSampleWeights({ cream: "", mid: "", low: "", junk: "" });
      setSamplePriceOverrides({ cream: "", mid: "", low: "", junk: "" });
    } else {
      if (effectivePrice === null || weight <= 0 || lineTotal === null) return;
      onAdd({
        id: uid(), itemType: "melee", vendor,
        group: assortment.group, assortmentKey: assortment.key,
        assortmentLabel: assortment.label,
        sizeRange, pricePerCt: effectivePrice,
        weight, lineTotal,
      });
      setWeightInput("");
      setPriceOverride("");
      setTotalOverride("");
    }
  }

  const canAdd = sampleMode
    ? (vendor && sampleAvgPc !== null && fullParcelWt > 0)
    : (vendor && effectivePrice !== null && weight > 0);

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-400 text-right">Prices updated {meleeData.updatedAt}</p>

      {/* Assortment picker (hidden in sample mode) */}
      {!sampleMode && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
          {GROUPS.map((group) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{group}</p>
              <div className="flex flex-wrap gap-2">
                {ASSORTMENTS.filter((a) => a.group === group).map((a) => (
                  <Chip key={a.key} label={a.label} active={selectedKey === a.key}
                    onClick={() => setSelectedKey(a.key)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pricing card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Chip label="Standard"     active={!sampleMode} onClick={() => setSampleMode(false)} />
          <Chip label="Sample Grade" active={sampleMode}  onClick={() => setSampleMode(true)}  />
        </div>

        {/* Sieve size (shared) */}
        <div className="space-y-2">
          <label className="label">Sieve size</label>
          <div className="flex flex-wrap gap-2">
            {SIZE_RANGES.map((sr) => (
              <Chip key={sr} label={sr} active={sizeRange === sr} onClick={() => setSizeRange(sr)} />
            ))}
          </div>
        </div>

        {/* ── Standard mode ── */}
        {!sampleMode && (
          <>
            <div className="space-y-1">
              <label className="label">Weight (ct)</label>
              <input type="text" inputMode="decimal" value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="input w-full" placeholder="e.g. 3.50" />
            </div>

            <div className="pt-2 border-t border-zinc-100 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-zinc-400">
                    Per carat{priceOverride !== "" ? " (override)" : " (sheet)"}
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
                  <input type="text" inputMode="decimal" value={priceOverride}
                    onChange={(e) => { setPriceOverride(e.target.value); setTotalOverride(""); }}
                    placeholder={sheetPrice !== null ? String(sheetPrice) : ""}
                    className="input flex-1" />
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
                  <input type="text" inputMode="numeric" value={totalOverride}
                    onChange={(e) => { setTotalOverride(e.target.value); setPriceOverride(""); }}
                    placeholder={calcTotal != null ? String(calcTotal) : ""}
                    className="input flex-1" />
                  {totalOverride && (
                    <button type="button" onClick={() => setTotalOverride("")}
                      className="text-xs text-zinc-400 underline shrink-0">clear</button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Sample grade mode ── */}
        {sampleMode && (
          <>
            <div className="space-y-1">
              <label className="label">Full parcel weight (ct)</label>
              <input type="text" inputMode="decimal" value={parcelWeight}
                onChange={(e) => setParcelWeight(e.target.value)}
                className="input w-full" placeholder="e.g. 100" />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sample breakdown</p>
              {sampleCalc.map((g) => (
                <div key={g.key} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-medium text-zinc-800">{g.label}</span>
                      <span className="ml-2 text-xs text-zinc-400">{g.desc}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" inputMode="decimal" value={sampleWeights[g.key]}
                      onChange={(e) => setSampleWeights((prev) => ({ ...prev, [g.key]: e.target.value }))}
                      className="input flex-1" placeholder="sample wt (ct)" />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-zinc-400">$</span>
                      <input
                        type="text" inputMode="decimal"
                        value={samplePriceOverrides[g.key]}
                        onChange={(e) => setSamplePriceOverrides((prev) => ({ ...prev, [g.key]: e.target.value }))}
                        placeholder={g.blendedPrice !== null ? String(g.blendedPrice) : ""}
                        className="input w-16 text-sm"
                      />
                      <span className="text-xs text-zinc-400">/ct</span>
                    </div>
                    <span className="text-sm font-medium text-zinc-700 w-16 text-right shrink-0">
                      {g.val > 0 ? fmt(g.val) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sample summary */}
            {sampleTotalWt > 0 && (
              <div className="bg-zinc-50 rounded-lg px-3 py-3 space-y-1 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Sample weight</span>
                  <span>{sampleTotalWt.toFixed(2)}ct</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Sample value</span>
                  <span>{fmt(sampleTotalVal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-zinc-800 border-t border-zinc-200 pt-1 mt-1">
                  <span>Sample avg $/ct</span>
                  <span>{sampleAvgPc !== null ? fmtPc(sampleAvgPc) : "—"}/ct</span>
                </div>
                {fullParcelWt > 0 && (
                  <div className="flex justify-between font-bold text-zinc-900 text-base border-t border-zinc-200 pt-1 mt-1">
                    <span>Extrapolated ({fullParcelWt}ct)</span>
                    <span>{extrapolated !== null ? fmt(extrapolated) : "—"}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <button type="button" onClick={handleAdd} disabled={!canAdd}
          className="btn-primary w-full">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
