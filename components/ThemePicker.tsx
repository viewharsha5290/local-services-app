"use client";

import { Check } from "lucide-react";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";
import { useTheme } from "@/lib/useTheme";

/** Five looks, one tap each. The choice applies straight away and is remembered on this device. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="themes" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className="theme-opt" onClick={() => setTheme(t.id)}>
          <span className="theme-swatch" style={{ background: t.swatch.bg }}>
            <i style={{ flex: 2, background: t.swatch.brand }} />
            <i style={{ flex: 1, background: t.swatch.highlight }} />
            <i style={{ flex: 1, background: t.swatch.ink }} />
          </span>
          <span className="n">
            {t.name}
            {t.id === DEFAULT_THEME && theme !== t.id ? <span className="eyebrow">Default</span> : null}
            {theme === t.id && <Check size={16} strokeWidth={3} />}
          </span>
          <span className="d">{t.blurb}</span>
        </button>
      ))}
    </div>
  );
}

export function ThemeSheet() {
  return (
    <>
      <h3 style={{ marginBottom: 4 }}>Choose your look</h3>
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 16 }}>
        Same site, five styles. Your pick is remembered on this device.
      </p>
      <ThemePicker />
    </>
  );
}
