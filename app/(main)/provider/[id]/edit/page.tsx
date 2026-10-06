"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AppLoading } from "@/components/AppLoading";
import { useApp } from "@/lib/store";
import { Provider } from "@/lib/types";
import { searchCities } from "@/lib/cities";
import { MAX_PHOTOS } from "@/lib/photos";

const RESPONSE_TIMES = ["an hour", "a few hours", "a day", "a few days"];
const BIO_MAX = 600;
const AREA_MAX = 60;

/** Where the business that manages a listing (or an admin) keeps it up to date. The name, trade,
 * badges, ratings and reviews are deliberately not here — see migration 011. */
export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { auth, getProvider, refreshProvider } = useApp();
  const [loaded, setLoaded] = useState(false);
  const provider = getProvider(params.id);

  // Always start from what the database has now, and reach listings outside the city being browsed.
  useEffect(() => {
    let active = true;
    refreshProvider(params.id).then(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [params.id, refreshProvider]);

  if (!loaded) return <AppLoading />;

  const canEdit = Boolean(provider && auth.id) && (provider!.ownerId === auth.id || Boolean(auth.isAdmin));
  if (!provider || !canEdit) {
    return (
      <div className="content-narrow">
        <TopBar back title="Edit listing" />
        <p style={{ marginBottom: 16 }}>
          {!provider
            ? "This listing doesn't exist."
            : auth.status === "guest"
              ? "Sign in with the account that manages this listing to edit it."
              : "Only the business that manages this listing can edit it. If it's yours, claim it from the listing page first."}
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => router.push(provider ? `/provider/${provider.id}` : "/search")}>
          {provider ? "Back to the listing" : "Back to search"}
        </button>
      </div>
    );
  }

  return (
    <div className="content-narrow" style={{ paddingBottom: 48 }}>
      <TopBar back title="Edit listing" subtitle={provider.name} />
      {/* keyed so the form starts over from the saved values if the listing is reloaded */}
      <DetailsForm key={provider.id} provider={provider} />
      <PhotosEditor provider={provider} />
      <p className="text-muted" style={{ fontSize: 13.5, marginTop: 28 }}>
        The business name and trade can&rsquo;t be changed here. Reviews and ratings come from neighbours and from Google, and can&rsquo;t be edited by the business.
      </p>
    </div>
  );
}

function DetailsForm({ provider }: { provider: Provider }) {
  const { updateListing } = useApp();
  const [bio, setBio] = useState(provider.bio ?? "");
  const [phone, setPhone] = useState(provider.phone ? provider.phoneDisplay : "");
  const [areaNote, setAreaNote] = useState(provider.areaNote ?? "");
  const [cities, setCities] = useState<string[]>(provider.cities);
  const [respondsWithin, setRespondsWithin] = useState(provider.respondsWithin ?? "");
  const [cityQuery, setCityQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const suggestions = searchCities(cityQuery).filter((c) => !cities.includes(c));
  const touch = () => {
    setSaved(false);
    setError(null);
  };

  function addCity(city: string) {
    setCities((list) => [...list, city]);
    setCityQuery("");
    touch();
  }

  async function save() {
    const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    if (digits.length !== 10) return setError("Enter a 10-digit phone number.");
    if (cities.length === 0) return setError("Add at least one city you work in.");
    setSaving(true);
    setError(null);
    const result = await updateListing(provider.id, { bio, phone, areaNote, cities, respondsWithin: respondsWithin || null });
    setSaving(false);
    if (result.error) setError(result.error);
    else setSaved(true);
  }

  return (
    <section className="editblock">
      <h2>Details</h2>
      <div className="field">
        <label htmlFor="edit-bio">About the business</label>
        <textarea
          id="edit-bio"
          className="input"
          rows={5}
          maxLength={BIO_MAX}
          placeholder="What you do, who you do it for, and anything a neighbour should know before calling."
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            touch();
          }}
        />
        <span className="hint">{`${bio.length} / ${BIO_MAX}`}</span>
      </div>
      <div className="field">
        <label htmlFor="edit-phone">Phone number</label>
        <input
          id="edit-phone"
          className="input"
          type="tel"
          autoComplete="tel"
          placeholder="(905) 555-0142"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            touch();
          }}
        />
        <span className="hint">Neighbours call and message this number straight from your listing.</span>
      </div>
      <div className="field">
        <label htmlFor="edit-area">Neighbourhood or area</label>
        <input
          id="edit-area"
          className="input"
          maxLength={AREA_MAX}
          placeholder="e.g. Stoney Creek"
          value={areaNote}
          onChange={(e) => {
            setAreaNote(e.target.value);
            touch();
          }}
        />
      </div>
      <div className="field" style={{ position: "relative" }}>
        <label htmlFor="edit-city">Cities you work in</label>
        <div className="chip-row" style={{ flexWrap: "wrap" }}>
          {cities.map((c) => (
            <span key={c} className="chip" style={{ cursor: "default", paddingRight: 6 }}>
              {c}
              <button
                type="button"
                className="chip-x"
                aria-label={`Remove ${c}`}
                onClick={() => {
                  setCities((list) => list.filter((x) => x !== c));
                  touch();
                }}
              >
                <X size={15} />
              </button>
            </span>
          ))}
        </div>
        {cities.length < 12 && (
          <input
            id="edit-city"
            className="input"
            placeholder="Add a city"
            autoComplete="off"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) {
                e.preventDefault();
                addCity(suggestions[0]);
              }
            }}
          />
        )}
        {suggestions.length > 0 && (
          <div className="suggest">
            {suggestions.map((c) => (
              <button key={c} type="button" className="list-row" style={{ padding: "10px 14px", minHeight: 44 }} onClick={() => addCity(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <span className="hint">Your listing shows up in searches for each of these.</span>
      </div>
      <div className="field">
        <label htmlFor="edit-responds">How quickly you usually respond</label>
        <select
          id="edit-responds"
          className="input"
          value={respondsWithin}
          onChange={(e) => {
            setRespondsWithin(e.target.value);
            touch();
          }}
        >
          <option value="">Don&rsquo;t show</option>
          {RESPONSE_TIMES.map((t) => (
            <option key={t} value={t}>{`Within ${t}`}</option>
          ))}
        </select>
      </div>
      {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </button>
        {saved && <span role="status" style={{ fontSize: 14, fontWeight: 600 }}>Saved. Your listing is updated.</span>}
      </div>
    </section>
  );
}

function PhotosEditor({ provider }: { provider: Provider }) {
  const { addListingPhotos, saveListingPhotos } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const photos = provider.photos;
  const room = MAX_PHOTOS - photos.length;

  async function run(label: string, action: () => Promise<{ error?: string }>) {
    setBusy(label);
    setError(null);
    setConfirming(null);
    const result = await action();
    setBusy(null);
    if (result.error) setError(result.error);
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (files.length > room) return setError(`You can add ${room} more ${room === 1 ? "photo" : "photos"} (the limit is ${MAX_PHOTOS}).`);
    run(`Adding ${files.length} ${files.length === 1 ? "photo" : "photos"}…`, () => addListingPhotos(provider.id, files));
  }

  return (
    <section className="editblock">
      <h2>Work photos</h2>
      <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
        {`Up to ${MAX_PHOTOS} photos of your own work. The cover photo is what people see on your card in search results.`}
      </p>
      {photos.length > 0 && (
        <ul className="photogrid">
          {photos.map((src, i) => (
            <li key={src}>
              {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage */}
              <img src={src} alt={`Work photo ${i + 1} of ${photos.length}`} loading="lazy" />
              {i === 0 && <span className="covertag">Cover</span>}
              <div className="photoactions">
                {i > 0 && (
                  <button type="button" disabled={Boolean(busy)} onClick={() => run("Saving…", () => saveListingPhotos(provider.id, [src, ...photos.filter((p) => p !== src)]))}>
                    <Star size={14} /> Make cover
                  </button>
                )}
                {confirming === src ? (
                  <button type="button" className="danger" disabled={Boolean(busy)} onClick={() => run("Removing…", () => saveListingPhotos(provider.id, photos.filter((p) => p !== src)))}>
                    <Trash2 size={14} /> Confirm remove
                  </button>
                ) : (
                  <button type="button" disabled={Boolean(busy)} onClick={() => setConfirming(src)} aria-label={`Remove photo ${i + 1}`}>
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={pick} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-secondary" disabled={Boolean(busy) || room <= 0} onClick={() => fileInput.current?.click()}>
          <ImagePlus size={18} /> {photos.length ? "Add more photos" : "Add photos"}
        </button>
        <span role="status" style={{ fontSize: 14 }}>{busy ?? (room <= 0 ? `You've reached the limit of ${MAX_PHOTOS}.` : "")}</span>
      </div>
      {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: 0 }}>{error}</p>}
      <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
        Only add photos you took or have permission to use. We resize them and remove location data before they&rsquo;re published.
      </p>
    </section>
  );
}
