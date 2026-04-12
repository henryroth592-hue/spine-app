"use client";

import { useState, useMemo } from "react";
import type { SingleShape, StoneColor, StoneClarity, RecutLocation, SingleCartItem } from "@/lib/types";
import type { Shape } from "@/lib/types";
import { giaCertCost, CUT_COST_USA, CUT_COST_CHINA } from "@/lib/certCosts";
import { getRapPrice, RAP_EXPORTED_AT } from "@/lib/rapLookup";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);
const fmt  = (n: number | null | undefined) => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
const fmtP = (n: number | null | undefined) => n != null ? `${n.toFixed(1)}%` : "—";

const SHAPES: SingleShape[] = ["BR","PR","MQ","OV","RA","EM","AS","OE","OM","PS","CU","FA"];
const COLORS: StoneColor[]   = ["D","E","F","G","H","I","J","K","L","M"];
const CLARITIES: StoneClarity[] = ["IF","VVS1","VVS2","VS1","VS2","SI1","SI2","I1","I2"];
const LOSS_OPTIONS = [10, 15, 20];

// Smart cut location: >1ct AND J-or-better AND SI2-or-better → USA
const GOOD_COLORS = new Set<StoneColor>(["D","E","F","G","H","I","J"]);
const GOOD_CLARITIES = new Set<StoneClarity>(["IF","VVS1","VVS2","VS1","VS2","SI1","SI2"]);

type ActiveDisc = "asis" | "recut";

interface Props { vendor: string; onAdd: (item: SingleCartItem) => void; }

export default function SinglesForm({ vendor, onAdd }: Props) {
  const [shape,   setShape]   = useState<SingleShape>("BR");
  const [weight,  setWeight]  = useState("1.10");
  const [color,   setColor]   = useState<StoneColor>("H");
  const [clarity, setClarity] = useState<StoneClarity>("VS2");

  // Rap
  const [rapOverride,    setRapOverride]    = useState("");
  const [useRapOverride, setUseRapOverride] = useState(false);

  // Cost toggles
  const [inclRecut, setInclRecut] = useState(true);
  const [inclCert,  setInclCert]  = useState(true);
  const [lossPercent, setLossPercent] = useState(10);
  const [locationOverride, setLocationOverride] = useState<RecutLocation | null>(null);

  // Discount inputs — bidirectional
  const [activeDisc,    setActiveDisc]    = useState<ActiveDisc>("asis");
  const [asIsDiscInput, setAsIsDiscInput] = useState("-75");
  const [recutDiscInput,setRecutDiscInput]= useState("-50");

  // ── Derived ──────────────────────────────────────────────────────────────
  const wt = parseFloat(weight) || 0;
  const rapShape: Shape = shape === "BR" ? "round" : "fancy";

  const lookedUp = wt > 0 ? getRapPrice(rapShape, wt, color, clarity) : null;
  const rap      = useRapOverride ? (parseFloat(rapOverride) || 0) : (lookedUp ?? 0);

  const endWt       = wt > 0 ? parseFloat((wt * (1 - lossPercent / 100)).toFixed(3)) : 0;
  const lookedUpEnd = endWt > 0 ? getRapPrice(rapShape, endWt, color, clarity) : null;
  const endRap      = lookedUpEnd ?? 0;

  // Smart location
  const smartLocation: RecutLocation = wt > 1.00 && GOOD_COLORS.has(color) && GOOD_CLARITIES.has(clarity) ? "USA" : "China";
  const location  = locationOverride ?? smartLocation;
  const cutPerCt  = location === "USA" ? CUT_COST_USA : CUT_COST_CHINA;

  // Costs
  const certCostAsIs = inclCert ? giaCertCost(wt) : 0;
  const cutCost      = inclRecut ? wt * cutPerCt : 0;
  const certCostEnd  = inclCert && inclRecut ? giaCertCost(endWt) : 0;
  const recutCosts   = cutCost + certCostEnd;

  // Parse inputs
  const asIsDiscPct  = parseFloat(asIsDiscInput)  || 0;
  const recutDiscPct = parseFloat(recutDiscInput) || 0;

  const asIsNetFromInput  = rap > 0 && wt > 0  ? rap * wt * (1 + asIsDiscPct / 100) - certCostAsIs : null;
  const recutNetFromInput = inclRecut && endRap > 0 && endWt > 0 ? endRap * endWt * (1 + recutDiscPct / 100) - recutCosts : null;

  // Linked: set as-is → derive breakeven recut disc
  const linkedRecutDisc = useMemo(() => {
    if (!inclRecut || asIsNetFromInput == null || endRap <= 0 || endWt <= 0) return null;
    return ((( asIsNetFromInput + recutCosts) / (endRap * endWt)) - 1) * 100;
  }, [inclRecut, asIsNetFromInput, endRap, endWt, recutCosts]);

  // Linked: set recut → derive breakeven as-is disc
  const linkedAsIsDisc = useMemo(() => {
    if (!inclRecut || recutNetFromInput == null || rap <= 0 || wt <= 0) return null;
    return (((recutNetFromInput + certCostAsIs) / (rap * wt)) - 1) * 100;
  }, [inclRecut, recutNetFromInput, rap, wt, certCostAsIs]);

  const displayAsIsDisc  = activeDisc === "recut" ? linkedAsIsDisc  : asIsDiscPct;
  const displayRecutDisc = activeDisc === "asis"  ? linkedRecutDisc : recutDiscPct;

  const displayAsIsNet  = rap > 0 && wt > 0 && displayAsIsDisc != null
    ? rap * wt * (1 + displayAsIsDisc / 100) - certCostAsIs : null;
  const displayRecutNet = inclRecut && endRap > 0 && endWt > 0 && displayRecutDisc != null
    ? endRap * endWt * (1 + displayRecutDisc / 100) - recutCosts : null;

  function handleAdd(mode: "as-is" | "recut") {
    if (!vendor || wt <= 0) return;
    const net = mode === "as-is" ? displayAsIsNet : displayRecutNet;
    if (net == null) return;
    onAdd({
      id: uid(), itemType: "single", vendor, shape, weight: wt, color, clarity,
      rapPerCt: rap, mode,
      asIsDiscountPct: displayAsIsDisc ?? undefined,
      asIsPrice: rap > 0 ? rap * wt * (1 + (displayAsIsDisc ?? 0) / 100) : undefined,
      certCost: certCostAsIs,
      asIsNet: displayAsIsNet ?? undefined,
      recutLocation: location,
      endWeight: endWt,
      endRapPerCt: endRap,
      cuttingCost: cutCost,
      recutCertCost: certCostEnd,
      recutDiscountPct: displayRecutDisc ?? undefined,
      recutNet: displayRecutNet ?? undefined,
      breakevenDisc: activeDisc === "asis" ? linkedRecutDisc ?? undefined : linkedAsIsDisc ?? undefined,
      lineTotal: Math.round(net),
    });
  }

  return (
    <div className="space-y-4">

      {/* Stone details */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
        <div className="space-y-2">
          <label className="label">Shape</label>
          <div className="flex flex-wrap gap-2">
            {SHAPES.map((s) => <Chip key={s} label={s} active={shape === s} onClick={() => setShape(s)} />)}
          </div>
        </div>

        <div className="space-y-1">
          <label className="label">Weight (ct)</label>
          <input type="text" inputMode="decimal" value={weight}
            onChange={(e) => setWeight(e.target.value)} className="input w-full" placeholder="1.10" />
        </div>

        <div className="space-y-2">
          <label className="label">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => <Chip key={c} label={c} active={color === c} onClick={() => setColor(c)} />)}
          </div>
        </div>

        <div className="space-y-2">
          <label className="label">Clarity</label>
          <div className="flex flex-wrap gap-2">
            {CLARITIES.map((cl) => <Chip key={cl} label={cl} active={clarity === cl} onClick={() => setClarity(cl)} />)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <label className="label">Rap $/ct</label>
            <button type="button"
              onClick={() => { setUseRapOverride((v) => !v); if (!useRapOverride && lookedUp) setRapOverride(String(lookedUp)); }}
              className="text-xs text-zinc-400 underline">
              {useRapOverride ? "Use list" : "Override"}
            </button>
          </div>
          {useRapOverride
            ? <input type="text" inputMode="decimal" value={rapOverride}
                onChange={(e) => setRapOverride(e.target.value)} className="input w-full" placeholder="4800" />
            : <div className={`input w-full ${lookedUp ? "text-zinc-900" : "text-zinc-400"}`}>
                {lookedUp ? `$${lookedUp.toLocaleString()}` : wt > 0 ? "Not found — use override" : "Enter weight first"}
                {lookedUp && <span className="ml-2 text-xs text-zinc-400">from {RAP_EXPORTED_AT}</span>}
              </div>
          }
        </div>
      </div>

      {/* Cost settings */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={inclRecut} onChange={(e) => { setInclRecut(e.target.checked); if (!e.target.checked) setActiveDisc("asis"); }} className="rounded" />
            Recut
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={inclCert} onChange={(e) => setInclCert(e.target.checked)} className="rounded" />
            Cert
          </label>
        </div>

        {inclRecut && (
          <>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Estimated loss</p>
              <div className="flex gap-2">
                {LOSS_OPTIONS.map((l) => (
                  <Chip key={l} label={`${l}%`} active={lossPercent === l} onClick={() => setLossPercent(l)} />
                ))}
              </div>
              {endWt > 0 && <p className="text-xs text-zinc-400">{wt}ct → {endWt}ct after recut</p>}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Cut location</p>
              <div className="flex gap-2 flex-wrap">
                {(["USA", "China"] as RecutLocation[]).map((loc) => (
                  <Chip key={loc}
                    label={`${loc} $${loc === "USA" ? "175" : "100"}/ct${locationOverride == null && loc === smartLocation ? " ·auto" : ""}`}
                    active={location === loc}
                    onClick={() => setLocationOverride(loc)} />
                ))}
              </div>
            </div>
          </>
        )}

        {wt > 0 && (inclCert || inclRecut) && (
          <div className="text-xs text-zinc-400 space-y-0.5">
            {inclCert && <p>Cert (as-is {wt}ct): ${certCostAsIs}</p>}
            {inclRecut && <p>Cutting: {wt}ct × ${cutPerCt} = ${cutCost.toLocaleString()}</p>}
            {inclCert && inclRecut && <p>Cert (end {endWt}ct): ${certCostEnd}</p>}
            {inclRecut && <p className="font-medium">Total recut costs: ${Math.round(recutCosts).toLocaleString()}</p>}
          </div>
        )}
      </div>

      {/* Discount analysis */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-0">
        <label className="label mb-3 block">Discount Analysis</label>
        <p className="text-xs text-zinc-400 mb-4">Edit one — the other updates to break even.</p>

        {/* As-Is row */}
        <div className={`py-3 space-y-1 ${inclRecut ? "border-b border-zinc-100" : ""}`}
          onClick={() => setActiveDisc("asis")}>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            As-Is · {wt}ct
          </p>
          {activeDisc === "asis" ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setAsIsDiscInput(String((parseFloat(asIsDiscInput)||0)*-1)); }}
                className="w-8 h-8 rounded-lg border border-zinc-300 text-sm font-medium flex items-center justify-center shrink-0">±</button>
              <input type="text" inputMode="decimal" value={asIsDiscInput}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setAsIsDiscInput(e.target.value)}
                className="input w-28" />
              <span className="text-base font-semibold text-zinc-700">{fmt(displayAsIsNet)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xl font-bold text-zinc-900">{fmtP(displayAsIsDisc)}</p>
              <p className="text-base font-semibold text-zinc-600">{fmt(displayAsIsNet)}</p>
              <p className="text-xs text-zinc-400">tap to edit</p>
            </div>
          )}
          {inclCert && certCostAsIs > 0 && (
            <p className="text-xs text-zinc-400">after ${certCostAsIs} cert</p>
          )}
        </div>

        {/* Recut row */}
        {inclRecut && (
          <div className="py-3 space-y-1" onClick={() => setActiveDisc("recut")}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Recut · ~{endWt}ct
            </p>
            {activeDisc === "recut" ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setRecutDiscInput(String((parseFloat(recutDiscInput)||0)*-1)); }}
                  className="w-8 h-8 rounded-lg border border-zinc-300 text-sm font-medium flex items-center justify-center shrink-0">±</button>
                <input type="text" inputMode="decimal" value={recutDiscInput}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRecutDiscInput(e.target.value)}
                  className="input w-28" />
                <span className="text-base font-semibold text-zinc-700">{fmt(displayRecutNet)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-xl font-bold text-zinc-900">{fmtP(displayRecutDisc)}</p>
                <p className="text-base font-semibold text-zinc-600">{fmt(displayRecutNet)}</p>
                <p className="text-xs text-zinc-400">tap to edit</p>
              </div>
            )}
            {recutCosts > 0 && (
              <p className="text-xs text-zinc-400">after ${Math.round(recutCosts).toLocaleString()} costs</p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-zinc-100">
          <button type="button" onClick={() => handleAdd("as-is")}
            disabled={!vendor || displayAsIsNet == null}
            className="btn-primary flex-1">
            {inclRecut ? "Add As-Is" : "Add to Cart"}
          </button>
          {inclRecut && (
            <button type="button" onClick={() => handleAdd("recut")}
              disabled={!vendor || displayRecutNet == null}
              className="btn-primary flex-1">
              Add Recut
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
