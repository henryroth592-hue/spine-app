"use client";

import { useState, useCallback, useMemo } from "react";
import type { Shape, StoneColor, StoneClarity, SingleMode, RecutLocation, SingleCartItem } from "@/lib/types";
import { giaCertCost, WEIGHT_LOSS, CUT_COST_USA, CUT_COST_CHINA } from "@/lib/certCosts";
import { Chip } from "./Chip";

const uid = () => Math.random().toString(36).slice(2);
const fmt = (n: number | null | undefined) => (n != null ? `$${Math.round(n).toLocaleString()}` : "—");
const fmtPct = (n: number | null | undefined) => (n != null ? `${n.toFixed(1)}%` : "—");

const COLORS: StoneColor[] = ["D","E","F","G","H","I","J","K","L","M"];
const CLARITIES: StoneClarity[] = ["IF","VVS1","VVS2","VS1","VS2","SI1","SI2","I1","I2"];
const RECUT_DISC_SCENARIOS = [-30,-35,-38,-40,-42,-45,-48,-50,-55,-60];

interface Props { vendor: string; onAdd: (item: SingleCartItem) => void; }

export default function SinglesForm({ vendor, onAdd }: Props) {
  const [shape, setShape] = useState<Shape>("round");
  const [weight, setWeight] = useState<string>("1.10");
  const [color, setColor] = useState<StoneColor>("H");
  const [clarity, setClarity] = useState<StoneClarity>("VS2");
  const [rapPerCt, setRapPerCt] = useState<string>("");

  const [mode, setMode] = useState<SingleMode>("as-is");

  // as-is
  const [asIsDisc, setAsIsDisc] = useState<string>("-65");
  const [asIsDiscInput, setAsIsDiscInput] = useState<string>("-65");

  // recut
  const [recutLocation, setRecutLocation] = useState<RecutLocation>("USA");
  const [endRapPerCt, setEndRapPerCt] = useState<string>("");
  const [recutDisc, setRecutDisc] = useState<string>("-50");
  const [recutDiscInput, setRecutDiscInput] = useState<string>("-50");

  // override
  const [overridePrice, setOverridePrice] = useState<string>("");

  const wt = parseFloat(weight) || 0;
  const rap = parseFloat(rapPerCt) || 0;
  const certCost = giaCertCost(wt);

  // ── as-is calcs ──
  const asIsDiscPct = parseFloat(asIsDisc) || 0;
  const asIsPrice = rap > 0 ? rap * wt * (1 + asIsDiscPct / 100) : null;
  const asIsNet = asIsPrice !== null ? asIsPrice - certCost : null;

  // ── recut calcs ──
  const endWt = wt > 0 ? parseFloat((wt * (1 - WEIGHT_LOSS)).toFixed(3)) : 0;
  const cutCostPerCt = recutLocation === "USA" ? CUT_COST_USA : CUT_COST_CHINA;
  const cuttingCost = wt > 0 ? wt * cutCostPerCt : 0;
  const endCertCost = giaCertCost(endWt);
  const totalRecutCosts = cuttingCost + endCertCost;
  const endRap = parseFloat(endRapPerCt) || 0;

  const breakeven = useMemo(() => {
    if (!asIsNet || endRap <= 0 || endWt <= 0) return null;
    const requiredRevenue = asIsNet + totalRecutCosts;
    return ((requiredRevenue / (endRap * endWt)) - 1) * 100;
  }, [asIsNet, endRap, endWt, totalRecutCosts]);

  const recutDiscPct = parseFloat(recutDisc) || 0;
  const recutScenarios = useMemo(() => {
    if (endRap <= 0 || endWt <= 0) return [];
    return RECUT_DISC_SCENARIOS.map((d) => {
      const revenue = endRap * endWt * (1 + d / 100);
      const net = revenue - totalRecutCosts;
      return { disc: d, net, better: asIsNet !== null && net > asIsNet };
    });
  }, [endRap, endWt, totalRecutCosts, asIsNet]);

  const selectedRecutNet = endRap > 0 && endWt > 0
    ? endRap * endWt * (1 + recutDiscPct / 100) - totalRecutCosts : null;

  const handleAdd = useCallback(() => {
    if (!vendor || wt <= 0) return;
    let lineTotal = 0;
    const base: Omit<SingleCartItem, "lineTotal"> = {
      id: uid(), itemType: "single", vendor, shape, weight: wt, color, clarity,
      rapPerCt: rap, mode,
    };
    if (mode === "as-is" && asIsNet !== null) {
      lineTotal = asIsNet;
      onAdd({ ...base, asIsDiscountPct: asIsDiscPct, asIsPrice: asIsPrice!, certCost, asIsNet, lineTotal });
    } else if (mode === "recut" && selectedRecutNet !== null) {
      lineTotal = selectedRecutNet;
      onAdd({ ...base, recutLocation, endWeight: endWt, endRapPerCt: endRap,
        cuttingCost, recutCertCost: endCertCost, recutDiscountPct: recutDiscPct,
        recutNet: selectedRecutNet, breakevenDisc: breakeven ?? undefined,
        asIsDiscountPct: asIsDiscPct, asIsNet: asIsNet ?? undefined, certCost,
        lineTotal });
    } else if (mode === "override" && overridePrice) {
      lineTotal = parseFloat(overridePrice);
      onAdd({ ...base, overridePrice: lineTotal, lineTotal });
    }
  }, [vendor, wt, shape, color, clarity, rap, mode, asIsDiscPct, asIsPrice, certCost, asIsNet,
      recutLocation, endWt, endRap, cuttingCost, endCertCost, recutDiscPct, selectedRecutNet,
      breakeven, overridePrice, onAdd]);

  const canAdd = vendor && wt > 0 && (
    (mode === "as-is" && asIsNet !== null) ||
    (mode === "recut" && selectedRecutNet !== null) ||
    (mode === "override" && !!overridePrice)
  );

  return (
    <div className="space-y-4">

      {/* Stone details */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
        <div className="space-y-2">
          <label className="label">Shape</label>
          <div className="flex gap-2">
            <Chip label="Round" active={shape === "round"} onClick={() => setShape("round")} />
            <Chip label="Fancy" active={shape === "fancy"} onClick={() => setShape("fancy")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label">Weight (ct)</label>
            <input type="text" inputMode="decimal" value={weight}
              onChange={(e) => setWeight(e.target.value)} className="input w-full" placeholder="1.10" />
          </div>
          <div className="space-y-1">
            <label className="label">Rap $/ct</label>
            <input type="text" inputMode="decimal" value={rapPerCt}
              onChange={(e) => setRapPerCt(e.target.value)} className="input w-full" placeholder="4800" />
          </div>
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
      </div>

      {/* Mode tabs */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-4">
        <div className="flex gap-2">
          <Chip label="As-Is" active={mode === "as-is"} onClick={() => setMode("as-is")} />
          <Chip label="Recut" active={mode === "recut"} onClick={() => setMode("recut")} />
          <Chip label="Override" active={mode === "override"} onClick={() => setMode("override")} />
        </div>

        {/* AS-IS ── */}
        {mode === "as-is" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">As-is discount %</label>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => { const f = (parseFloat(asIsDisc) || 0) * -1; setAsIsDisc(String(f)); setAsIsDiscInput(String(f)); }}
                  className="w-10 h-10 rounded-lg border border-zinc-300 text-lg font-medium flex items-center justify-center">±</button>
                <input type="text" inputMode="decimal" value={asIsDiscInput}
                  onChange={(e) => { setAsIsDiscInput(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p)) setAsIsDisc(String(p)); }}
                  className="input w-28" />
              </div>
            </div>
            {rap > 0 && wt > 0 && (
              <div className="rounded-lg bg-zinc-50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Rap value</span><span>{fmt(rap * wt)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Price at {fmtPct(asIsDiscPct)}</span><span>{fmt(asIsPrice)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">GIA cert ({wt}ct)</span><span>−{fmt(certCost)}</span></div>
                <div className="flex justify-between font-semibold border-t border-zinc-200 pt-1"><span>Net</span><span>{fmt(asIsNet)}</span></div>
              </div>
            )}
          </div>
        )}

        {/* RECUT ── */}
        {mode === "recut" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Chip label="USA $175/ct" active={recutLocation === "USA"} onClick={() => setRecutLocation("USA")} />
              <Chip label="China $100/ct" active={recutLocation === "China"} onClick={() => setRecutLocation("China")} />
            </div>

            {/* As-is to establish baseline */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">As-is discount % (baseline)</label>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => { const f = (parseFloat(asIsDisc) || 0) * -1; setAsIsDisc(String(f)); setAsIsDiscInput(String(f)); }}
                  className="w-10 h-10 rounded-lg border border-zinc-300 text-lg font-medium flex items-center justify-center">±</button>
                <input type="text" inputMode="decimal" value={asIsDiscInput}
                  onChange={(e) => { setAsIsDiscInput(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p)) setAsIsDisc(String(p)); }}
                  className="input w-28" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">End weight</label>
                <p className="input w-full bg-zinc-50 text-zinc-500">{endWt > 0 ? `${endWt}ct` : "—"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">End rap $/ct</label>
                <input type="text" inputMode="decimal" value={endRapPerCt}
                  onChange={(e) => setEndRapPerCt(e.target.value)} className="input w-full" placeholder="5200" />
              </div>
            </div>

            {wt > 0 && (
              <div className="rounded-lg bg-zinc-50 p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">As-is net</span><span>{fmt(asIsNet)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Cutting cost ({wt}ct × ${cutCostPerCt})</span><span>−{fmt(cuttingCost)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">GIA cert ({endWt}ct)</span><span>−{fmt(endCertCost)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Total recut costs</span><span>−{fmt(totalRecutCosts)}</span></div>
                {breakeven !== null && (
                  <div className="flex justify-between font-semibold border-t border-zinc-200 pt-1 text-amber-700">
                    <span>Breakeven discount</span><span>{fmtPct(breakeven)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Scenario table */}
            {recutScenarios.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-500 uppercase tracking-wide">Net at various recut discounts</label>
                <div className="rounded-lg border border-zinc-200 overflow-hidden text-sm">
                  {recutScenarios.map(({ disc, net, better }) => (
                    <div key={disc}
                      className={`flex justify-between items-center px-3 py-2 border-b border-zinc-100 last:border-0
                        ${better ? "bg-emerald-50" : ""}`}>
                      <span className="text-zinc-600">{disc}%</span>
                      <span className={`font-medium ${better ? "text-emerald-700" : "text-zinc-700"}`}>{fmt(net)}</span>
                      {better && <span className="text-xs text-emerald-600">✓ worth recutting</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pick a discount to cart */}
            {endRap > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Add recut to cart at discount %</label>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => { const f = (parseFloat(recutDisc) || 0) * -1; setRecutDisc(String(f)); setRecutDiscInput(String(f)); }}
                    className="w-10 h-10 rounded-lg border border-zinc-300 text-lg font-medium flex items-center justify-center">±</button>
                  <input type="text" inputMode="decimal" value={recutDiscInput}
                    onChange={(e) => { setRecutDiscInput(e.target.value); const p = parseFloat(e.target.value); if (!isNaN(p)) setRecutDisc(String(p)); }}
                    className="input w-28" />
                  <span className="text-sm text-zinc-500">= {fmt(selectedRecutNet)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OVERRIDE ── */}
        {mode === "override" && (
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Total price ($)</label>
            <input type="text" inputMode="decimal" value={overridePrice}
              onChange={(e) => setOverridePrice(e.target.value)} className="input w-40" placeholder="2500" />
          </div>
        )}

        <button type="button" onClick={handleAdd} disabled={!canAdd} className="btn-primary w-full">
          Add to Cart
        </button>
      </div>
    </div>
  );
}
