import type { CartItem, ParcelCartItem, SingleCartItem, MetalCartItem, CustomCartItem } from "./types";

function lineText(item: CartItem): { label: string; detail: string; total: string } {
  const total = `$${Math.round(item.lineTotal).toLocaleString()}`;

  if (item.itemType === "parcel") {
    const i = item as ParcelCartItem;
    const shape = i.shape === "round" ? "Rnd" : "Fcy";
    return {
      label: `${shape} ${i.sizeRange} ${i.colorBand} ${i.clarity} ×${i.qty}`,
      detail: `$${i.pricePerCt}/ct × ${i.avgWeight}ct avg`,
      total,
    };
  }

  if (item.itemType === "single") {
    const i = item as SingleCartItem;
    const modeLabel = i.mode === "as-is" ? "as-is" : "recut";
    const disc = i.mode === "as-is" ? i.asIsDiscountPct : i.recutDiscountPct;
    return {
      label: `${i.shape} ${i.weight}ct ${i.color} ${i.clarity} [${modeLabel}]`,
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

  const i = item as CustomCartItem;
  return { label: i.description, detail: "custom", total };
}

export function buildReceiptText(vendor: string, cart: CartItem[], screenTotal: number): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const line = "─".repeat(36);
  const lines = [
    "DIAMOND BUY RECEIPT",
    date,
    "",
    `Vendor: ${vendor || "—"}`,
    line,
  ];

  cart.forEach((item, i) => {
    const { label, detail, total } = lineText(item);
    lines.push(`${i + 1}. ${label}`);
    if (detail) lines.push(`   ${detail}`);
    lines.push(`   ${total}`);
  });

  lines.push(line);
  lines.push(`TOTAL: $${Math.round(screenTotal).toLocaleString()}`);
  return lines.join("\n");
}

export function buildReceiptHtml(vendor: string, cart: CartItem[], screenTotal: number): string {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const rows = cart.map((item, i) => {
    const { label, detail, total } = lineText(item);
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;">${i + 1}. ${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;">${detail}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">${total}</td>
      </tr>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#18181b;color:#fff;padding:24px 28px;">
      <h1 style="margin:0;font-size:20px;font-weight:700;">Diamond Buy Receipt</h1>
      <p style="margin:6px 0 0;font-size:14px;color:#a1a1aa;">${date}</p>
    </div>
    <div style="padding:20px 28px;">
      <p style="margin:0 0 16px;font-size:15px;color:#374151;"><strong>Vendor:</strong> ${vendor || "—"}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Item</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Details</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:16px;padding-top:16px;border-top:2px solid #18181b;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:16px;font-weight:700;color:#18181b;">Total</span>
        <span style="font-size:22px;font-weight:800;color:#18181b;">$${Math.round(screenTotal).toLocaleString()}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}
