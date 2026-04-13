"use client";

import { useState } from "react";
import type { CartItem } from "@/lib/types";
import { buildReceiptText, buildReceiptHtml } from "@/lib/receiptUtils";

interface Props {
  vendor: string;
  vendorEmail?: string;
  cart: CartItem[];
  screenTotal: number;
  onClose: () => void;
}

export default function ReceiptModal({ vendor, vendorEmail, cart, screenTotal, onClose }: Props) {
  const [email,      setEmail]      = useState(vendorEmail ?? "");
  const [simplified, setSimplified] = useState(false);
  const [status,     setStatus]     = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg,     setErrMsg]     = useState("");

  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const text = buildReceiptText(vendor, cart, screenTotal, simplified);
  const html = buildReceiptHtml(vendor, cart, screenTotal, appBaseUrl, simplified);

  async function handleSend() {
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim(), vendor, html, text }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        const d = await res.json();
        setErrMsg(d.error ?? "Send failed");
        setStatus("error");
      }
    } catch (e) {
      setErrMsg(String(e));
      setStatus("error");
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Purchase Note - ${vendor}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("Receipt copied to clipboard");
      }
    } catch { /* user cancelled */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
          <h2 className="font-semibold text-zinc-900">Purchase Note</h2>
          <div className="flex items-center gap-3">
            {/* Detailed / Summary toggle */}
            <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-xs">
              <button type="button"
                onClick={() => setSimplified(false)}
                className={`px-3 py-1.5 ${!simplified ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>
                Detailed
              </button>
              <button type="button"
                onClick={() => setSimplified(true)}
                className={`px-3 py-1.5 ${simplified ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>
                Summary
              </button>
            </div>
            <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Receipt preview */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="text-xs text-zinc-700 whitespace-pre-wrap font-mono bg-zinc-50 rounded-xl p-4 leading-relaxed">
            {text}
          </pre>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-zinc-200 space-y-3 shrink-0">
          <button type="button" onClick={handleShare} className="btn-primary w-full">
            Share Receipt
          </button>

          <div className="space-y-2">
            <label className="text-xs text-zinc-500">Email receipt to</label>
            <div className="flex gap-2">
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                className="input flex-1"
                placeholder="someone@example.com"
              />
              <button type="button"
                onClick={handleSend}
                disabled={!email.trim() || status === "sending" || status === "sent"}
                className="btn-primary px-4 shrink-0">
                {status === "sending" ? "..." : status === "sent" ? "Sent" : "Send"}
              </button>
            </div>
            {status === "error" && <p className="text-xs text-red-500">{errMsg}</p>}
            {status === "sent"  && <p className="text-xs text-emerald-600">Sent to {email}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
