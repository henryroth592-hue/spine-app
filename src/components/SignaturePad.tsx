"use client";

import { useRef, useState, useEffect } from "react";

interface Props {
  onSigned: (dataUrl: string) => void;
  onCleared: () => void;
}

export default function SignaturePad({ onSigned, onCleared }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  // Keep callbacks in refs so event listeners don't go stale
  const onSignedRef  = useRef(onSigned);
  const onClearedRef = useRef(onCleared);
  useEffect(() => { onSignedRef.current  = onSigned;  }, [onSigned]);
  useEffect(() => { onClearedRef.current = onCleared; }, [onCleared]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Match internal canvas resolution to display (HiDPI-safe)
    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);

    function xy(e: PointerEvent): [number, number] {
      const r = canvas!.getBoundingClientRect();
      const d = window.devicePixelRatio || 1;
      return [(e.clientX - r.left) * d, (e.clientY - r.top) * d];
    }

    function onDown(e: PointerEvent) {
      e.preventDefault();
      drawingRef.current = true;
      canvas!.setPointerCapture(e.pointerId);
      const ctx = canvas!.getContext("2d")!;
      ctx.beginPath();
      const [x, y] = xy(e);
      ctx.moveTo(x, y);
    }

    function onMove(e: PointerEvent) {
      if (!drawingRef.current) return;
      e.preventDefault();
      const ctx = canvas!.getContext("2d")!;
      ctx.strokeStyle  = "#111827";
      ctx.lineWidth    = 2.5 * (window.devicePixelRatio || 1);
      ctx.lineCap      = "round";
      ctx.lineJoin     = "round";
      const [x, y] = xy(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function onUp() {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      setHasSig(true);
      onSignedRef.current(canvas!.toDataURL("image/png"));
    }

    canvas.addEventListener("pointerdown",  onDown, { passive: false });
    canvas.addEventListener("pointermove",  onMove, { passive: false });
    canvas.addEventListener("pointerup",    onUp);
    canvas.addEventListener("pointercancel", onUp);

    return () => {
      canvas.removeEventListener("pointerdown",  onDown);
      canvas.removeEventListener("pointermove",  onMove);
      canvas.removeEventListener("pointerup",    onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onClearedRef.current();
  }

  return (
    <div className="space-y-2">
      <div
        className="relative rounded-xl border-2 border-dashed border-zinc-300 bg-white overflow-hidden"
        style={{ height: "160px" }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: "none", display: "block" }}
        />
        {!hasSig && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-zinc-300">Sign here</p>
          </div>
        )}
      </div>
      {hasSig && (
        <button type="button" onClick={clear} className="text-xs text-zinc-400 underline">
          Clear &amp; re-sign
        </button>
      )}
    </div>
  );
}
