"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const GAP = 14;
const EVERY_MS = 3000;

/** A row of cards shown a screenful at a time: swipe on a phone, arrows with a mouse, dots for
 * where you are. It moves on by itself every few seconds until the visitor touches it, and not at
 * all for anyone who has asked their device for less motion. The stylesheet decides how many cards
 * fit across (.carousel-track > *); this works the pages out from what it measures. */
export function Carousel({ label, children }: { label: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  const [auto, setAuto] = useState(true);

  /** Which screenful is showing. The last one can stop short of a full step when the cards do not
   * divide evenly, so reaching the end counts as the last page. */
  const current = useCallback((count: number) => {
    const el = track.current;
    if (!el) return 0;
    if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) return count - 1;
    return Math.min(count - 1, Math.round(el.scrollLeft / (el.clientWidth + GAP)));
  }, []);

  const goTo = useCallback((target: number, count: number) => {
    const el = track.current;
    if (!el) return;
    const wrapped = ((target % count) + count) % count;
    el.scrollTo({ left: wrapped * (el.clientWidth + GAP), behavior: "smooth" });
  }, []);

  // How many screenfuls there are depends on the card width the stylesheet chose.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const perView = Math.max(1, Math.round((el.clientWidth + GAP) / (card.offsetWidth + GAP)));
      setPages(Math.max(1, Math.ceil(el.children.length / perView)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  useEffect(() => {
    if (!auto || pages < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!track.current || document.hidden) return;
      goTo(current(pages) + 1, pages);
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [auto, pages, goTo, current]);

  const stop = () => setAuto(false);
  // after the window is resized there can be fewer screenfuls than the one last shown
  const showing = Math.min(page, pages - 1);

  function move(to: number) {
    stop();
    goTo(to, pages);
  }

  return (
    <div
      className="carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerDown={stop}
      onMouseEnter={stop}
      onWheel={stop}
      onTouchStart={stop}
      onFocus={stop}
      onKeyDown={stop}
    >
      <div ref={track} className="carousel-track" onScroll={() => setPage(current(pages))}>
        {children}
      </div>
      {pages > 1 && (
        <>
          <button type="button" className="carousel-arrow prev" onClick={() => move(showing - 1)} aria-label="Previous">
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <button type="button" className="carousel-arrow next" onClick={() => move(showing + 1)} aria-label="Next">
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>
          <div className="carousel-dots">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" className={i === showing ? "on" : ""} onClick={() => move(i)} aria-label={`Show ${i + 1} of ${pages}`} aria-current={i === showing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
