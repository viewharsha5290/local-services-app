"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface SheetContextValue {
  open: (node: ReactNode) => void;
  close: () => void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);

  const close = useCallback(() => setContent(null), []);
  const open = useCallback((node: ReactNode) => setContent(node), []);

  return (
    <SheetContext.Provider value={{ open, close }}>
      {children}
      {content && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sheet-grabber" />
            {content}
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
