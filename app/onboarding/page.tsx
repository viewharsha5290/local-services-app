"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair } from "lucide-react";
import { useApp } from "@/lib/store";
import { HOME_POSTAL_CODE } from "@/lib/data";
import { isValidPostalCode, normalizePostalCode } from "@/lib/postalCode";
import { CANADIAN_CITIES, searchCities } from "@/lib/cities";

const DEFAULT_CITY = "Toronto, ON";

export default function OnboardingPage() {
  const { setLocation } = useApp();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scope, setScope] = useState<"postal" | "city">("postal");
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = searchCities(cityInput);

  function selectCity(city: string) {
    setCityInput(city);
    setShowSuggestions(false);
    setError(null);
  }

  function submitPostal() {
    const trimmed = code.trim();
    if (!trimmed) {
      setLocation({ scope: "postal", postalCode: HOME_POSTAL_CODE });
      router.push("/search");
      return;
    }
    if (!isValidPostalCode(trimmed)) {
      setError("Enter a valid postal code (e.g. L8E or L8E 4A7)");
      return;
    }
    setError(null);
    setLocation({ scope: "postal", postalCode: normalizePostalCode(trimmed) });
    router.push("/search");
  }

  function submitCity() {
    const trimmed = cityInput.trim();
    if (!trimmed) {
      setLocation({ scope: "city", city: DEFAULT_CITY });
      router.push("/search");
      return;
    }
    const exact = CANADIAN_CITIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      setError(null);
      setLocation({ scope: "city", city: exact });
      router.push("/search");
      return;
    }
    if (suggestions.length === 1) {
      setError(null);
      setLocation({ scope: "city", city: suggestions[0] });
      router.push("/search");
      return;
    }
    setError("Select a city from the list");
  }

  function submit() {
    if (scope === "postal") submitPostal();
    else submitCity();
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setLocation({ scope: "postal", postalCode: HOME_POSTAL_CODE, coords: { lat: position.coords.latitude, lng: position.coords.longitude } });
        router.push("/search");
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <div className="app-main no-tabbar" style={{ paddingTop: 40, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: "8px 0 4px" }}>Where should we search?</h2>
        <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 20px" }}>
          {scope === "postal"
            ? "Enter your postal code so every result is sorted by distance from you, not the whole city."
            : "Pick a city and we'll show providers who offer service there."}
        </p>

        <div className="seg" style={{ marginBottom: 16 }} role="radiogroup" aria-label="Search scope">
          <button
            type="button"
            className={`seg-opt ${scope === "postal" ? "checked" : ""}`}
            onClick={() => {
              setScope("postal");
              setError(null);
            }}
          >
            Postal code
          </button>
          <button
            type="button"
            className={`seg-opt ${scope === "city" ? "checked" : ""}`}
            onClick={() => {
              setScope("city");
              setError(null);
            }}
          >
            City-wide
          </button>
        </div>

        {scope === "postal" ? (
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Postal code</label>
            <input
              className="input"
              placeholder={`e.g. ${HOME_POSTAL_CODE} or L8E`}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            {error && <span style={{ fontSize: 12, color: "#b3413a" }}>{error}</span>}
          </div>
        ) : (
          <div className="field" style={{ marginBottom: 14, position: "relative" }}>
            <label>City</label>
            <input
              className="input"
              placeholder={`e.g. ${DEFAULT_CITY}`}
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                setShowSuggestions(true);
                if (error) setError(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setShowSuggestions(false)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete="off"
            />
            {error && <span style={{ fontSize: 12, color: "#b3413a" }}>{error}</span>}
            {showSuggestions && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-divider)",
                  boxShadow: "var(--shadow-md)",
                  marginTop: 2,
                }}
              >
                {suggestions.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className="list-row"
                    style={{ padding: "10px 12px" }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCity(city);
                    }}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {scope === "postal" && (
          <button type="button" className="btn btn-secondary btn-block" onClick={useCurrentLocation} disabled={locating}>
            <Crosshair size={16} />
            {locating ? "Locating…" : "Use current location"}
          </button>
        )}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Find providers
      </button>
    </div>
  );
}
