"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { areaLabel, isRegion, searchAreas } from "@/lib/cities";

const MAX_AREAS = 40;

/** Picks where a business works: any number of cities, whole provinces ("All of Ontario") or all
 * of Canada. Chosen areas show as chips; typing offers matches. Used when recommending a business
 * and on the Edit listing screen. */
export function AreaPicker({ id, value, onChange, placeholder = "Add a city or province" }: { id: string; value: string[]; onChange: (areas: string[]) => void; placeholder?: string }) {
  const [query, setQuery] = useState("");
  const suggestions = searchAreas(query).filter((a) => !value.includes(a));

  function add(area: string) {
    onChange([...value, area]);
    setQuery("");
  }

  return (
    <div style={{ position: "relative" }}>
      {value.length > 0 && (
        <div className="chip-row" style={{ flexWrap: "wrap", marginBottom: 8 }}>
          {value.map((a) => (
            <span key={a} className="chip" style={{ cursor: "default", paddingRight: 6 }}>
              {areaLabel(a)}
              <button type="button" className="chip-x" aria-label={`Remove ${areaLabel(a)}`} onClick={() => onChange(value.filter((x) => x !== a))}>
                <X size={15} />
              </button>
            </span>
          ))}
        </div>
      )}
      {value.length < MAX_AREAS && (
        <input
          id={id}
          className="input"
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length > 0) {
              e.preventDefault();
              add(suggestions[0]);
            }
          }}
        />
      )}
      {suggestions.length > 0 && (
        <div className="suggest">
          {suggestions.map((a) => (
            <button key={a} type="button" className="list-row" style={{ padding: "10px 14px", minHeight: 44 }} onClick={() => add(a)}>
              {isRegion(a) ? <b>{areaLabel(a)}</b> : a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
