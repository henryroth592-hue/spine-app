import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://api.gold-api.com/price/XAU/USD", {
      next: { revalidate: 300 }, // cache 5 minutes
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const price = data.price ?? data.ask ?? data.rate ?? null;
    if (!price) throw new Error("No price in response");
    return NextResponse.json({ price: Number(price), source: "gold-api.com", cached: false });
  } catch (err) {
    return NextResponse.json({ price: null, error: String(err) }, { status: 502 });
  }
}
