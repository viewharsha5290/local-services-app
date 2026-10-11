"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

/** A short confirmation that floats at the top of the screen and clears itself. Give it a new
 * `key` each time it should appear again, so its timer starts over. */
export function Toast({ message, onDone, duration = 3500 }: { message: string; onDone: () => void; duration?: number }) {
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [onDone, duration]);

  return (
    <div className="toast" role="status">
      <Check size={18} strokeWidth={2.6} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
