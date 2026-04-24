"use client";

import { useState } from "react";
import type { CartItem, PaymentRecord } from "@/lib/types";
import { buildReceiptText, buildReceiptHtml, buildOfficeText, buildOfficeHtml } from "@/lib/receiptUtils";

const OFFICE_EMAIL = "emma@rothschildtrading.com";

type Mode = "detailed" | "summary" | "office";

interface Props {
  vendor: string;
  buyer?: string;
  vendorEmail?: string;
  cart: CartItem[];
  screenTotal: number;
  payments?: PaymentRecord[];
  onClose: () => void;
}

export default function ReceiptModal({ vendor, buyer, vendorEmail, cart, screenTotal, payments = [], onClose }: Props) {
  const [mode,        setMode]        = useState<Mode>("detailed");
  const [email,       setEmail]       = useState(vendorEmail ?? "");
  const [officeEmail, setOfficeEmail] = useState(OFFICE_EMAIL);
  const [status,      setStatus]      = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg,      setErrMsg]      = useState("");

  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const text = mode === "office"
    ? buildOfficeText(vendor, buyer ?? "", cart, screenTotal, payments)
    : buildReceiptText(vendor, cart, screenTotal, mode === "summary");
  const html = mode === "office"
    ? buildOfficeHtml(vendor, buyer ?? "", cart, screenTotal, payments, appBaseUrl)
    : buildReceiptHtml(vendor, cart, screenTotal, appBaseUrl, mode === "summary");

  const activeEmail    = mode === "office" ? officeEmail : email;
  const setActiveEmail = mode === "office" ? setOfficeEmail : setEmail;

  async function handleSend() {
    if (!activeEmail.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: activeEmail.trim(), vendor, html, text }),
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
                onClick={() => { setMode("detailed"); setStatus("idle"); }}
                className={`px-3 py-1.5 ${mode === "detailed" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>
                Detailed
              </button>
              <button type="button"
                onClick={() => { setMode("summary"); setStatus("idle"); }}
                className={`px-3 py-1.5 ${mode === "summary" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>
                Summary
              </button>
              <button type="button"
                onClick={() => { setMode("office"); setStatus("idle"); }}
                className={`px-3 py-1.5 ${mode === "office" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}>
                Office
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
            <label className="text-xs text-zinc-500">
              {mode === "office" ? "Email to office" : "Email receipt to"}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                inputMode="email"
                value={activeEmail}
                onChange={(e) => { setActiveEmail(e.target.value); setStatus("idle"); }}
                className="input flex-1"
                placeholder="someone@example.com"
              />
              <button type="button"
                onClick={handleSend}
                disabled={!activeEmail.trim() || status === "sending" || status === "sent"}
                className="btn-primary px-4 shrink-0">
                {status === "sending" ? "..." : status === "sent" ? "Sent" : "Send"}
              </button>
            </div>
            {status === "error" && <p className="text-xs text-red-500">{errMsg}</p>}
            {status === "sent"  && <p className="text-xs text-emerald-600">Sent to {activeEmail}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
