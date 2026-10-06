"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Full-screen photo viewer: one photo at a time, side by side. Swipe, use the arrows on screen
 * or on the keyboard; Esc, the close button or a tap outside the photo closes it. */
export function PhotoViewer({ name, photos, start, onClose }: { name: string; photos: string[]; start: number; onClose: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(start);

  const go = useCallback(
    (to: number, smooth = true) => {
      const el = track.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(photos.length - 1, to));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: smooth ? "smooth" : "instant" });
    },
    [photos.length]
  );

  // Open on the photo that was tapped, take focus, and stop the page behind from scrolling.
  useEffect(() => {
    go(start, false);
    closeButton.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [go, start]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${name}: work photos`}>
      <div className="lightbox-bar">
        <span aria-live="polite">{`${index + 1} / ${photos.length}`}</span>
        <button ref={closeButton} type="button" className="lightbox-btn" onClick={onClose} aria-label="Close photos">
          <X size={22} />
        </button>
      </div>
      <div
        ref={track}
        className="lightbox-track"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photos.map((src, i) => (
          <div key={src} className="lightbox-slide" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage */}
            <img src={src} alt={`${name} work photo ${i + 1} of ${photos.length}`} loading={Math.abs(i - start) <= 1 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button type="button" className="lightbox-btn lightbox-prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous photo">
            <ChevronLeft size={26} />
          </button>
          <button type="button" className="lightbox-btn lightbox-next" onClick={() => go(index + 1)} disabled={index === photos.length - 1} aria-label="Next photo">
            <ChevronRight size={26} />
          </button>
        </>
      )}
    </div>
  );
}
