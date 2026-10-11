"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { CoverCrop } from "@/lib/types";
import { DEFAULT_CROP, MAX_ZOOM, coverStyle } from "@/lib/photos";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Frames a listing's cover photo: drag to choose the part that shows, zoom to crop in closer.
 * Nothing is cut from the photo itself; the listing just remembers where to look. */
export function CoverAdjuster({ src, initial, onSave, onClose }: { src: string; initial?: CoverCrop; onSave: (crop: CoverCrop | null) => Promise<{ error?: string }>; onClose: () => void }) {
  const [crop, setCrop] = useState<CoverCrop>(initial ?? DEFAULT_CROP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  /** Moves the photo by this many pixels inside the frame. */
  function nudge(dx: number, dy: number) {
    const box = frame.current?.getBoundingClientRect();
    const img = image.current;
    if (!box || !img?.naturalWidth) return;
    setCrop((c) => {
      // The photo fills the frame, then the zoom enlarges it; whatever hangs over the edge on
      // each axis is the room there is to slide it.
      const fill = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight) * c.zoom;
      const spareX = img.naturalWidth * fill - box.width;
      const spareY = img.naturalHeight * fill - box.height;
      return {
        zoom: c.zoom,
        x: spareX > 0.5 ? clamp(c.x - (dx / spareX) * 100, 0, 100) : c.x,
        y: spareY > 0.5 ? clamp(c.y - (dy / spareY) * 100, 0, 100) : c.y,
      };
    });
  }

  const zoomTo = (zoom: number) => setCrop((c) => ({ ...c, zoom: clamp(Math.round(zoom * 100) / 100, 1, MAX_ZOOM) }));

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    nudge(e.clientX - drag.current.x, e.clientY - drag.current.y);
    drag.current = { x: e.clientX, y: e.clientY };
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key in moves) {
      e.preventDefault();
      nudge(...moves[e.key]);
    } else if (e.key === "+" || e.key === "=") zoomTo(crop.zoom + 0.1);
    else if (e.key === "-") zoomTo(crop.zoom - 0.1);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const untouched = crop.x === DEFAULT_CROP.x && crop.y === DEFAULT_CROP.y && crop.zoom === DEFAULT_CROP.zoom;
    const result = await onSave(untouched ? null : crop);
    setSaving(false);
    if (result.error) setError(result.error);
    else onClose();
  }

  const style = coverStyle(crop);

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-panel cropper" role="dialog" aria-modal="true" aria-labelledby="cropper-title">
        <div className="cropper-head">
          <h3 id="cropper-title">Adjust cover photo</h3>
          <button type="button" className="chip-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="text-muted" style={{ fontSize: 14, margin: "0 0 14px" }}>
          Drag the photo to choose what shows, and zoom to crop in closer.
        </p>

        <div className="cropper-label">On your card in search results</div>
        <div
          ref={frame}
          className="cropper-frame"
          tabIndex={0}
          role="group"
          aria-label="Cover photo position. Drag, or use the arrow keys to move and plus or minus to zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          onWheel={(e) => zoomTo(crop.zoom - e.deltaY * 0.002)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage */}
          <img ref={image} src={src} alt="" draggable={false} style={style} />
        </div>

        <div className="cropper-zoom">
          <button type="button" className="chip-x" onClick={() => zoomTo(crop.zoom - 0.1)} disabled={crop.zoom <= 1} aria-label="Zoom out">
            <Minus size={18} />
          </button>
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={crop.zoom} onChange={(e) => zoomTo(Number(e.target.value))} aria-label="Zoom" />
          <button type="button" className="chip-x" onClick={() => zoomTo(crop.zoom + 0.1)} disabled={crop.zoom >= MAX_ZOOM} aria-label="Zoom in">
            <Plus size={18} />
          </button>
        </div>

        <div className="cropper-label">At the top of your listing</div>
        <div className="cropper-frame cropper-banner" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage */}
          <img src={src} alt="" style={style} />
        </div>

        {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: "12px 0 0" }}>{error}</p>}
        <div className="cropper-actions">
          <button type="button" className="cancel-link" style={{ border: 0, background: "none", cursor: "pointer", marginRight: "auto" }} onClick={() => setCrop(DEFAULT_CROP)}>
            Reset
          </button>
          <button type="button" className="cancel-link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save cover"}
          </button>
        </div>
      </div>
    </div>
  );
}
