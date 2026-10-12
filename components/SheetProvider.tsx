"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";

interface SheetContextValue {
  open: (node: ReactNode) => void;
  close: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);

  const close = useCallback(() => setContent(null), []);
  const open = useCallback((node: ReactNode) => setContent(node), []);

  // Escape closes whatever sheet is open.
  useEffect(() => {
    if (!content) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [content, close]);

  return (
    <SheetContext.Provider value={{ open, close }}>
      {children}
      {content && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet-panel sheet-framed" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sheet-grabber" />
            <button type="button" className="chip-x sheet-close" onClick={close} aria-label="Close">
              <X size={20} />
            </button>
            {/* only this part scrolls: the title at its top sticks, and the close button stays put */}
            <div className="sheet-scroll">{content}</div>
          </div>
        </div>
      )}
    </SheetContext.Provider>
  );
}

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useSheet must be used within SheetProvider");
  return ctx;
}
