import type { CartItem, ParcelCartItem, SingleCartItem, MetalCartItem, CustomCartItem, MeleeCartItem, GemParcelCartItem, SingleGemCartItem } from "./types";

// ── Per-line detail ───────────────────────────────────────────────────────────

function lineText(item: CartItem): { label: string; detail: string; total: string } {
  const total = `$${Math.round(item.lineTotal).toLocaleString()}`;

  if (item.itemType === "parcel") {
    const i = item as ParcelCartItem;
    const shape = i.shape === "round" ? "Rnd" : "Fcy";
    return {
      label: `${shape} ${i.sizeRange} ${i.colorBand} ${i.clarity} x${i.qty}`,
      detail: `$${i.pricePerCt}/ct x ${i.avgWeight}ct avg`,
      total,
    };
  }
  if (item.itemType === "single") {
    const i = item as SingleCartItem;
    const disc = i.mode === "as-is" ? i.asIsDiscountPct : i.recutDiscountPct;
    return {
      label: `${i.shape} ${i.weight}ct ${i.color} ${i.clarity} [${i.mode}]`,
      detail: disc != null ? `${disc.toFixed(1)}% off rap` : "",
      total,
    };
  }
  if (item.itemType === "metal") {
    const i = item as MetalCartItem;
    return {
      label: `${i.category} ${i.karat} ${i.grams}g`,
      detail: `${i.pctOfSpot}% of spot ($${i.spotPerOz.toFixed(0)}/oz)`,
      total,
    };
  }
  if (item.itemType === "melee") {
    const i = item as MeleeCartItem;
    return {
      label: `Melee – ${i.assortmentLabel} ${i.sizeRange}`,
      detail: `$${i.pricePerCt}/ct × ${i.weight}ct`,
      total,
    };
  }
  if (item.itemType === "gem-parcel") {
    const i = item as GemParcelCartItem;
    return {
      label: `Gem Parcel – ${i.gemType} ${i.weight}ct`,
      detail: `$${i.pricePerCt}/ct`,
      total,
    };
  }
  if (item.itemType === "single-gem") {
    const i = item as SingleGemCartItem;
    return {
      label: `Single Gem – ${i.gemType} ${i.weight}ct`,
      detail: `$${i.pricePerCt}/ct`,
      total,
    };
  }
  const i = item as CustomCartItem;
  return { label: i.description, detail: "custom", total };
}

// ── Summary grouping for simplified mode ─────────────────────────────────────

interface SummaryLine { label: string; detail: string; total: string; }

function buildSummary(cart: CartItem[]): SummaryLine[] {
  const lines: SummaryLine[] = [];

  // Singles
  const singles = cart.filter((i) => i.itemType === "single") as SingleCartItem[];
  if (singles.length) {
    const totalCt  = singles.reduce((s, i) => s + (i.mode === "recut" ? (i.endWeight ?? i.weight) : i.weight), 0);
    const totalAmt = singles.reduce((s, i) => s + i.lineTotal, 0);
    lines.push({
      label: `Single Stones (${singles.length} stone${singles.length > 1 ? "s" : ""})`,
      detail: `${totalCt.toFixed(2)} ct total`,
      total: `$${Math.round(totalAmt).toLocaleString()}`,
    });
  }

  // Parcels
  const parcels = cart.filter((i) => i.itemType === "parcel") as ParcelCartItem[];
  if (parcels.length) {
    const totalCt  = parcels.reduce((s, i) => s + i.avgWeight * i.qty, 0);
    const totalAmt = parcels.reduce((s, i) => s + i.lineTotal, 0);
    const totalStones = parcels.reduce((s, i) => s + i.qty, 0);
    lines.push({
      label: `Parcels (${totalStones} stone${totalStones > 1 ? "s" : ""})`,
      detail: `${totalCt.toFixed(2)} ct total`,
      total: `$${Math.round(totalAmt).toLocaleString()}`,
    });
  }

  // Metals
  const metals = cart.filter((i) => i.itemType === "metal") as MetalCartItem[];
  if (metals.length) {
    const totalG   = metals.reduce((s, i) => s + i.grams, 0);
    const totalAmt = metals.reduce((s, i) => s + i.lineTotal, 0);
    lines.push({
      label: `Metals (${metals.length} item${metals.length > 1 ? "s" : ""})`,
      detail: `${totalG.toFixed(2)}g total`,
      total: `$${Math.round(totalAmt).toLocaleString()}`,
    });
  }

  // Melee
  const melees = cart.filter((i) => i.itemType === "melee") as MeleeCartItem[];
  if (melees.length) {
    const totalWt  = melees.reduce((s, i) => s + i.weight, 0);
    const totalAmt = melees.reduce((s, i) => s + i.lineTotal, 0);
    lines.push({
      label: `Melee (${melees.length} lot${melees.length > 1 ? "s" : ""})`,
      detail: `${totalWt.toFixed(2)} ct total`,
      total: `$${Math.round(totalAmt).toLocaleString()}`,
    });
  }

  // Gems
  const gems = cart.filter((i) => i.itemType === "gem-parcel" || i.itemType === "single-gem") as (GemParcelCartItem | SingleGemCartItem)[];
  if (gems.length) {
    const totalWt  = gems.reduce((s, i) => s + i.weight, 0);
    const totalAmt = gems.reduce((s, i) => s + i.lineTotal, 0);
    lines.push({
      label: `Gems (${gems.length} item${gems.length > 1 ? "s" : ""})`,
      detail: `${totalWt.toFixed(2)} ct total`,
      total: `$${Math.round(totalAmt).toLocaleString()}`,
    });
  }

  // Custom
  const customs = cart.filter((i) => i.itemType === "custom") as CustomCartItem[];
  if (customs.length) {
    const totalAmt = customs.reduce((s, i) => s + i.lineTotal, 0);
    lines.push({
      label: `Other (${customs.length} item${customs.length > 1 ? "s" : ""})`,
      detail: "",
      total: `$${Math.round(totalAmt).toLocaleString()}`,
    });
  }

  return lines;
}

// ── Plain text ────────────────────────────────────────────────────────────────

export function buildReceiptText(vendor: string, cart: CartItem[], screenTotal: number, simplified = false): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const line = "-".repeat(36);
  const rows = simplified ? buildSummary(cart) : cart.map((item, i) => ({ ...lineText(item), idx: i + 1 }));

  const lines = [
    "PURCHASE NOTE",
    "Rothschild Trading Company",
    date,
    "",
    `Vendor: ${vendor || "-"}`,
    line,
  ];

  rows.forEach((row, i) => {
    if ("idx" in row) {
      lines.push(`${row.idx}. ${row.label}`);
    } else {
      lines.push(`${i + 1}. ${row.label}`);
    }
    if (row.detail) lines.push(`   ${row.detail}`);
    lines.push(`   ${row.total}`);
  });

  lines.push(line);
  lines.push(`TOTAL: $${Math.round(screenTotal).toLocaleString()}`);
  return lines.join("\n");
}

// ── HTML email ────────────────────────────────────────────────────────────────

export function buildReceiptHtml(
  vendor: string,
  cart: CartItem[],
  screenTotal: number,
  appBaseUrl: string,
  simplified = false,
): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rows = simplified ? buildSummary(cart) : cart.map(lineText);
  const logoUrl = `${appBaseUrl}/rtc-logo.png`;

  const rowsHtml = rows.map((row) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;">${row.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${row.detail}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">${row.total}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <!-- White logo area -->
    <div style="background:#ffffff;padding:20px 28px 18px;border-bottom:1px solid #e5e7eb;">
      <img src="${logoUrl}" alt="Rothschild Trading Company" style="height:50px;display:block;" />
    </div>

    <!-- Navy title bar -->
    <div style="background:#1e2a45;padding:14px 28px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td>
            <p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">Purchase Note</p>
            <p style="margin:3px 0 0;font-size:11px;color:#94a3b8;letter-spacing:0.05em;">${date.toUpperCase()}${simplified ? "&nbsp;&nbsp;&#183;&nbsp;&nbsp;SUMMARY" : ""}</p>
          </td>
        </tr>
      </table>
    </div>
    <div style="padding:20px 28px;">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;"><strong>Vendor:</strong> ${vendor || "-"}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Item</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Details</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Total</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <table style="width:100%;margin-top:16px;padding-top:16px;border-top:2px solid #1e2a45;">
        <tr>
          <td style="font-size:16px;font-weight:700;color:#1e2a45;">Total</td>
          <td style="text-align:right;font-size:22px;font-weight:800;color:#1e2a45;">$${Math.round(screenTotal).toLocaleString()}</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}
