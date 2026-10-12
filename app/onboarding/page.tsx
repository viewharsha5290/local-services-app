"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crosshair } from "lucide-react";
import { useApp } from "@/lib/store";
import { HOME_POSTAL_CODE } from "@/lib/data";
import { isValidPostalCode, normalizePostalCode } from "@/lib/postalCode";
import { CANADIAN_CITIES, searchCities } from "@/lib/cities";
import { BrandMark } from "@/components/BrandMark";

const DEFAULT_CITY = "Hamilton, ON";
// One tap for the places most of the directory is in.
const QUICK_CITIES = ["Hamilton, ON", "Toronto, ON", "Mississauga, ON", "Brampton, ON"];

/** Where to go once a place is chosen: the page the visitor was heading for, if it's one of ours. */
function nextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/onboarding") ? next : "/search";
}

export default function OnboardingPage() {
  const { setLocation } = useApp();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scope, setScope] = useState<"postal" | "city">("city");
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
      router.push(nextPath());
      return;
    }
    if (!isValidPostalCode(trimmed)) {
      setError("Enter a valid postal code (e.g. L8E or L8E 4A7)");
      return;
    }
    setError(null);
    setLocation({ scope: "postal", postalCode: normalizePostalCode(trimmed) });
    router.push(nextPath());
  }

  function submitCity() {
    const trimmed = cityInput.trim();
    if (!trimmed) {
      setLocation({ scope: "city", city: DEFAULT_CITY });
      router.push(nextPath());
      return;
    }
    const exact = CANADIAN_CITIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      setError(null);
      setLocation({ scope: "city", city: exact });
      router.push(nextPath());
      return;
    }
    if (suggestions.length === 1) {
      setError(null);
      setLocation({ scope: "city", city: suggestions[0] });
      router.push(nextPath());
      return;
    }
    setError("Select a city from the list");
  }

  function enterCity(city: string) {
    setLocation({ scope: "city", city });
    router.push(nextPath());
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
        router.push(nextPath());
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <div className="app-main no-tabbar" style={{ paddingTop: 40, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1 }}>
        <div className="welcome">
          <span className="welcome-brand">
            <BrandMark size={20} /> The Local Services
          </span>
          <h1>Find local businesses your neighbours recommend</h1>
          <p>Cakes, tailors, mechanics, priests and more. Free to use, and no account needed to look around.</p>
        </div>
        <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Where are you looking?</h2>
        <p className="text-muted" style={{ fontSize: 14, margin: "0 0 16px" }}>
          {scope === "postal" ? "Your postal code sorts every result by distance from you." : "Pick a city to see the businesses that work there."}
        </p>

        <div className="seg" style={{ marginBottom: 16 }} role="radiogroup" aria-label="Search scope">
          <button
            type="button"
            className={`seg-opt ${scope === "city" ? "checked" : ""}`}
            onClick={() => {
              setScope("city");
              setError(null);
            }}
          >
            By city
          </button>
          <button
            type="button"
            className={`seg-opt ${scope === "postal" ? "checked" : ""}`}
            onClick={() => {
              setScope("postal");
              setError(null);
            }}
          >
            Near me
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

        {scope === "city" && (
          <div className="chip-row" style={{ flexWrap: "wrap" }} role="group" aria-label="Popular cities">
            {QUICK_CITIES.map((city) => (
              <button key={city} type="button" className="chip" onClick={() => enterCity(city)}>
                {city.split(",")[0]}
              </button>
            ))}
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
        Show businesses
      </button>
    </div>
  );
}
