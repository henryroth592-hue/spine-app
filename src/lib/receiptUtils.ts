import type { CartItem, ParcelCartItem, SingleCartItem, MetalCartItem, CustomCartItem, MeleeCartItem, GemParcelCartItem, SingleGemCartItem, FJCartItem, PaymentRecord } from "./types";

const PMT_LABELS: Record<string, string> = {
  cash: "Cash",
  check: "Check",
  echeck: "Echeck",
  "bank-transfer": "Bank Transfer",
  "store-credit": "Store Credit",
};

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
  if (item.itemType === "fj") {
    const i = item as FJCartItem;
    return {
      label: `FJ – ${i.fjName} (${i.jewelryType})`,
      detail: `${i.components.length} component${i.components.length !== 1 ? "s" : ""}`,
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

  // Finished Jewelry
  const fjs = cart.filter((i) => i.itemType === "fj") as FJCartItem[];
  if (fjs.length) {
    const totalAmt = fjs.reduce((s, i) => s + i.lineTotal, 0);
    const totalComponents = fjs.reduce((s, i) => s + i.components.length, 0);
    lines.push({
      label: `Finished Jewelry (${fjs.length} piece${fjs.length !== 1 ? "s" : ""})`,
      detail: `${totalComponents} component${totalComponents !== 1 ? "s" : ""} total`,
      total: `$${Math.round(totalAmt).toLocaleString()}`,
    });
  }

  return lines;
}

// ── FJ-aware cart expansion ───────────────────────────────────────────────────

type ExpandedRow = { label: string; detail: string; total: string; idx?: number; indent?: boolean };

function expandCart(cart: CartItem[]): ExpandedRow[] {
  const rows: ExpandedRow[] = [];
  let idx = 1;
  for (const item of cart) {
    if (item.itemType === "fj") {
      const fj = item as FJCartItem;
      rows.push({
        idx,
        label: `FJ – ${fj.fjName} (${fj.jewelryType})`,
        detail: `${fj.components.length} component${fj.components.length !== 1 ? "s" : ""}`,
        total: `$${Math.round(fj.lineTotal).toLocaleString()}`,
      });
      fj.components.forEach((c) => {
        const lt = lineText(c);
        rows.push({ label: `  → ${lt.label}`, detail: lt.detail, total: lt.total, indent: true });
      });
    } else {
      rows.push({ ...lineText(item), idx });
    }
    idx++;
  }
  return rows;
}

// ── Plain text ────────────────────────────────────────────────────────────────

export function buildReceiptText(vendor: string, cart: CartItem[], screenTotal: number, simplified = false): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const line = "-".repeat(36);
  const rows = simplified ? buildSummary(cart) : expandCart(cart);

  const lines = [
    "PURCHASE NOTE",
    "Rothschild Trading Company",
    date,
    "",
    `Vendor: ${vendor || "-"}`,
    line,
  ];

  let summaryIdx = 1;
  rows.forEach((row) => {
    if ("indent" in row && row.indent) {
      lines.push(row.label);
      if (row.detail) lines.push(`        ${row.detail}`);
      lines.push(`        ${row.total}`);
    } else if ("idx" in row && row.idx != null) {
      lines.push(`${row.idx}. ${row.label}`);
      if (row.detail) lines.push(`   ${row.detail}`);
      lines.push(`   ${row.total}`);
    } else {
      lines.push(`${summaryIdx++}. ${row.label}`);
      if (row.detail) lines.push(`   ${row.detail}`);
      lines.push(`   ${row.total}`);
    }
  });

  lines.push(line);
  lines.push(`TOTAL: $${Math.round(screenTotal).toLocaleString()}`);
  return lines.join("\n");
}

// ── Office copy (purchase note + payment block) ───────────────────────────────

export function buildOfficeText(
  vendor: string,
  buyer: string,
  cart: CartItem[],
  screenTotal: number,
  payments: PaymentRecord[],
): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const line = "-".repeat(36);
  const rows = expandCart(cart);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = screenTotal - totalPaid;

  const lines = [
    "PURCHASE NOTE — OFFICE COPY",
    "Rothschild Trading Company",
    date,
    "",
    `Vendor: ${vendor || "-"}`,
    `Buyer:  ${buyer || "-"}`,
    line,
  ];

  let idx = 1;
  rows.forEach((row) => {
    if ("indent" in row && row.indent) {
      lines.push(row.label);
      if (row.detail) lines.push(`        ${row.detail}`);
      lines.push(`        ${row.total}`);
    } else {
      lines.push(`${idx++}. ${row.label}`);
      if (row.detail) lines.push(`   ${row.detail}`);
      lines.push(`   ${row.total}`);
    }
  });

  lines.push(line);
  lines.push(`TOTAL: $${Math.round(screenTotal).toLocaleString()}`);

  if (payments.length > 0) {
    lines.push("");
    lines.push("PAYMENT");
    lines.push(line);
    payments.forEach((p, i) => {
      const method = PMT_LABELS[p.method] ?? p.method;
      const check = p.checkNumber ? ` #${p.checkNumber}` : "";
      const account = p.account ? ` – ${p.account}` : "";
      lines.push(`${i + 1}. ${method}${check}${account}`);
      lines.push(`   ${p.date} · ${p.payee}`);
      if (p.description) lines.push(`   ${p.description}`);
      if (p.memo) lines.push(`   ${p.memo}`);
      lines.push(`   $${Math.round(p.amount).toLocaleString()}`);
    });
    lines.push(line);
    lines.push(`TOTAL PAID: $${Math.round(totalPaid).toLocaleString()}`);
    if (remaining > 0.5) lines.push(`REMAINING:  $${Math.round(remaining).toLocaleString()}`);
    else if (remaining < -0.5) lines.push(`OVER:       $${Math.round(Math.abs(remaining)).toLocaleString()}`);
    else lines.push("FULLY PAID");
  }

  return lines.join("\n");
}

export function buildOfficeHtml(
  vendor: string,
  buyer: string,
  cart: CartItem[],
  screenTotal: number,
  payments: PaymentRecord[],
  appBaseUrl: string,
): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rows = expandCart(cart);
  const logoUrl = `${appBaseUrl}/rtc-logo.png`;
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = screenTotal - totalPaid;

  const rowsHtml = rows.map((row) => {
    const isIndent = "indent" in row && row.indent;
    return `
    <tr>
      <td style="padding:${isIndent ? "4px 12px 4px 28px" : "8px 12px"};border-bottom:1px solid #e5e7eb;color:${isIndent ? "#6b7280" : "#374151"};font-size:${isIndent ? "12px" : "14px"};">${row.label}</td>
      <td style="padding:${isIndent ? "4px 12px" : "8px 12px"};border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:${isIndent ? "12px" : "13px"};">${row.detail}</td>
      <td style="padding:${isIndent ? "4px 12px" : "8px 12px"};border-bottom:1px solid #e5e7eb;text-align:right;font-weight:${isIndent ? "400" : "600"};color:${isIndent ? "#6b7280" : "#111827"};font-size:${isIndent ? "12px" : "14px"};">${row.total}</td>
    </tr>`;
  }).join("");

  const paymentsHtml = payments.length > 0 ? `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1e2a45;text-transform:uppercase;letter-spacing:.05em;">Payment</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Method</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Details</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${payments.map((p) => {
            const method = PMT_LABELS[p.method] ?? p.method;
            const check = p.checkNumber ? ` #${p.checkNumber}` : "";
            const account = p.account ? ` – ${p.account}` : "";
            const detail = [p.date, p.payee, p.description].filter(Boolean).join(" · ");
            return `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${method}${check}${account}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${detail}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;font-size:14px;">$${Math.round(p.amount).toLocaleString()}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <table style="width:100%;margin-top:12px;padding-top:12px;border-top:2px solid #1e2a45;">
        <tr>
          <td style="font-size:14px;font-weight:600;color:#1e2a45;">Total Paid</td>
          <td style="text-align:right;font-size:18px;font-weight:800;color:#1e2a45;">$${Math.round(totalPaid).toLocaleString()}</td>
        </tr>
        ${remaining > 0.5 ? `<tr><td style="font-size:13px;color:#b45309;">Remaining</td><td style="text-align:right;font-size:15px;font-weight:700;color:#b45309;">$${Math.round(remaining).toLocaleString()}</td></tr>` : ""}
        ${remaining < -0.5 ? `<tr><td style="font-size:13px;color:#dc2626;">Over</td><td style="text-align:right;font-size:15px;font-weight:700;color:#dc2626;">$${Math.round(Math.abs(remaining)).toLocaleString()}</td></tr>` : ""}
        ${Math.abs(remaining) <= 0.5 ? `<tr><td colspan="2" style="text-align:right;font-size:13px;color:#059669;font-weight:600;">✓ Fully Paid</td></tr>` : ""}
      </table>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#ffffff;padding:20px 28px 18px;border-bottom:1px solid #e5e7eb;">
      <img src="${logoUrl}" alt="Rothschild Trading Company" style="height:50px;display:block;" />
    </div>
    <div style="background:#1e2a45;padding:14px 28px;">
      <p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">Purchase Note</p>
      <p style="margin:3px 0 0;font-size:11px;color:#94a3b8;letter-spacing:0.05em;">${date.toUpperCase()}&nbsp;&nbsp;&#183;&nbsp;&nbsp;OFFICE COPY</p>
    </div>
    <div style="padding:20px 28px;">
      <p style="margin:0 0 4px;font-size:15px;color:#374151;"><strong>Vendor:</strong> ${vendor || "-"}</p>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;"><strong>Buyer:</strong> ${buyer || "-"}</p>
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
      ${paymentsHtml}
    </div>
  </div>
</body>
</html>`;
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
  const rows = simplified ? buildSummary(cart) : expandCart(cart);
  const logoUrl = `${appBaseUrl}/rtc-logo.png`;

  const rowsHtml = rows.map((row) => {
    const isIndent = "indent" in row && row.indent;
    return `
    <tr>
      <td style="padding:${isIndent ? "4px 12px 4px 28px" : "8px 12px"};border-bottom:1px solid #e5e7eb;color:${isIndent ? "#6b7280" : "#374151"};font-size:${isIndent ? "12px" : "14px"};">${row.label}</td>
      <td style="padding:${isIndent ? "4px 12px" : "8px 12px"};border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:${isIndent ? "12px" : "13px"};">${row.detail}</td>
      <td style="padding:${isIndent ? "4px 12px" : "8px 12px"};border-bottom:1px solid #e5e7eb;text-align:right;font-weight:${isIndent ? "400" : "600"};color:${isIndent ? "#6b7280" : "#111827"};font-size:${isIndent ? "12px" : "14px"};">${row.total}</td>
    </tr>`;
  }).join("");

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
