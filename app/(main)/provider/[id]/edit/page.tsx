"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Crop, ImagePlus, Star, Trash2, X } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { AppLoading } from "@/components/AppLoading";
import { PostsEditor } from "@/components/PostsEditor";
import { Toast } from "@/components/Toast";
import { CoverAdjuster } from "@/components/CoverAdjuster";
import { useApp } from "@/lib/store";
import { Provider } from "@/lib/types";
import { NATIONWIDE, searchCities } from "@/lib/cities";
import { MAX_PHOTOS, coverStyle } from "@/lib/photos";
import { cleanWebsite } from "@/lib/website";

const RESPONSE_TIMES = ["an hour", "a few hours", "a day", "a few days"];
const BIO_MAX = 600;
const AREA_MAX = 60;
// Enough for a business that works province-wide; the database function enforces the same cap.
const MAX_CITIES = 40;
const cityLabel = (c: string) => (c === NATIONWIDE ? "All of Canada" : c);

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
    <div className="content-narrow">
      <TopBar back title="Edit listing" subtitle={provider.name} />
      {auth.isAdmin && <CategoryForm provider={provider} />}
      {/* The details form wraps the other sections so its Save bar sits at the very bottom of the
          screen, after everything a manager might have changed. Keyed so the form starts over
          from the saved values if the listing is reloaded. */}
      <DetailsForm key={provider.id} provider={provider} isAdmin={Boolean(auth.isAdmin)}>
        <PostsEditor provider={provider} />
        <PhotosEditor provider={provider} />
        <p className="text-muted" style={{ fontSize: 13.5, margin: "28px 0" }}>
          {auth.isAdmin ? "" : "The business name and trade can’t be changed here. "}
          Reviews and ratings come from neighbours and from Google, and can&rsquo;t be edited by the business.
        </p>
      </DetailsForm>
    </div>
  );
}

/** Admins only: owners can't change their own trade (the database function refuses them too). */
function CategoryForm({ provider }: { provider: Provider }) {
  const { categories, setListingCategory } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: string) {
    setSaving(true);
    setError(null);
    const result = await setListingCategory(provider.id, next);
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <section className="editblock">
      <h2>Category</h2>
      <div className="field">
        <label htmlFor="edit-category">Filed under (admin only)</label>
        <select id="edit-category" className="input" value={provider.category} disabled={saving} onChange={(e) => change(e.target.value)}>
          {!categories.some((c) => c.name === provider.category) && <option value={provider.category}>{provider.category}</option>}
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="hint">
          {saving ? "Saving…" : "Changes as soon as you pick one."} <Link href="/admin/categories">Manage categories</Link>
        </span>
      </div>
      {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: 0 }}>{error}</p>}
    </section>
  );
}

function DetailsForm({ provider, isAdmin, children }: { provider: Provider; isAdmin: boolean; children: React.ReactNode }) {
  const { updateListing, setListingName, setListingWebsite } = useApp();
  const [website, setWebsite] = useState(provider.website ?? "");
  // Only an admin can correct the name; the database refuses anyone else (migration 018).
  const [name, setName] = useState(provider.name);
  const [bio, setBio] = useState(provider.bio ?? "");
  const [phone, setPhone] = useState(provider.phone ? provider.phoneDisplay : "");
  const [areaNote, setAreaNote] = useState(provider.areaNote ?? "");
  const [cities, setCities] = useState<string[]>(provider.cities);
  const [respondsWithin, setRespondsWithin] = useState(provider.respondsWithin ?? "");
  const [cityQuery, setCityQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Counts saves, so saving twice in a row shows the toast again; null when it isn't showing.
  const [toast, setToast] = useState<number | null>(null);
  const hideToast = useCallback(() => setToast(null), []);

  // "All of Canada" is offered for a business that serves people anywhere (online classes, say).
  const wantsNationwide = /^(all|can|onl|any)/i.test(cityQuery.trim());
  const suggestions = [...(wantsNationwide ? [NATIONWIDE] : []), ...searchCities(cityQuery)].filter((c) => !cities.includes(c));
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
    const cleanName = name.trim().replace(/\s+/g, " ");
    const nameChanged = isAdmin && cleanName !== provider.name;
    const detailsChanged =
      bio !== (provider.bio ?? "") ||
      phone !== (provider.phone ? provider.phoneDisplay : "") ||
      areaNote !== (provider.areaNote ?? "") ||
      respondsWithin !== (provider.respondsWithin ?? "") ||
      cities.join("|") !== provider.cities.join("|");
    // A name or website change on its own doesn't re-save the details, so it works on listings whose details
    // wouldn't pass the checks below (no phone number, or one from outside Canada).
    const site = cleanWebsite(website);
    const websiteChanged = site.link !== (provider.website ?? null);
    const saveDetails = detailsChanged || !(nameChanged || websiteChanged);
    if (nameChanged && cleanName.length < 2) return setError("Enter a name of at least 2 characters.");
    if (site.error) return setError(site.error);
    if (saveDetails) {
      const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
      if (digits.length !== 10) return setError("Enter a 10-digit phone number.");
      if (cities.length === 0) return setError("Add at least one city you work in.");
    }
    setSaving(true);
    setError(null);
    let result: { error?: string } = {};
    if (nameChanged) result = await setListingName(provider.id, cleanName);
    if (!result.error && websiteChanged) result = await setListingWebsite(provider.id, site.link);
    if (!result.error && saveDetails) result = await updateListing(provider.id, { bio, phone, areaNote, cities, respondsWithin: respondsWithin || null });
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      setSaved(true);
      setToast((n) => (n ?? 0) + 1);
    }
  }

  return (
    <>
    <section className="editblock">
      <h2>Details</h2>
      {isAdmin && (
        <div className="field">
          <label htmlFor="edit-name">Business name (admin only)</label>
          <input
            id="edit-name"
            className="input"
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              touch();
            }}
          />
        </div>
      )}
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
        <label htmlFor="edit-website">Website or social page</label>
        <input
          id="edit-website"
          className="input"
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          placeholder="example.com or instagram.com/yourname"
          value={website}
          maxLength={300}
          onChange={(e) => {
            setWebsite(e.target.value);
            touch();
          }}
        />
        <span className="hint">One link: your own website, or your Instagram or Facebook page. Leave it empty to show none.</span>
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
            <span key={cityLabel(c)} className="chip" style={{ cursor: "default", paddingRight: 6 }}>
              {c}
              <button
                type="button"
                className="chip-x"
                aria-label={`Remove ${cityLabel(c)}`}
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
        {cities.length < MAX_CITIES && (
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
              <button key={cityLabel(c)} type="button" className="list-row" style={{ padding: "10px 14px", minHeight: 44 }} onClick={() => addCity(c)}>
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
    </section>
    {children}
    <div className="savebar">
      <div style={{ minWidth: 0, flex: "1 1 220px" }}>
        {error ? (
          <span role="alert" style={{ color: "var(--color-danger)", fontWeight: 600 }}>{error}</span>
        ) : saved ? (
          <span style={{ fontWeight: 600 }}>Saved. Your listing is updated.</span>
        ) : (
          <span className="text-muted">Photos and updates save as you add them. Save changes keeps your edits to the details; Cancel leaves them as they were.</span>
        )}
      </div>
      <div className="savebar-actions">
        <Link href={`/provider/${provider.id}`} className="cancel-link">
          Cancel
        </Link>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
    {toast !== null && <Toast key={toast} message="Changes saved" onDone={hideToast} />}
    </>
  );
}

function PhotosEditor({ provider }: { provider: Provider }) {
  const { addListingPhotos, saveListingPhotos, saveCoverCrop } = useApp();
  const [adjusting, setAdjusting] = useState(false);
  const closeAdjuster = useCallback(() => setAdjusting(false), []);
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

  /** Puts the photo first, then opens the adjuster so its manager can frame it straight away. */
  async function makeCover(src: string) {
    setBusy("Saving…");
    setError(null);
    setConfirming(null);
    const result = await saveListingPhotos(provider.id, [src, ...photos.filter((p) => p !== src)]);
    setBusy(null);
    if (result.error) setError(result.error);
    else setAdjusting(true);
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
        {`Up to ${MAX_PHOTOS} photos of your own work. The cover photo is what people see on your card in search results; use Adjust cover to zoom in or reposition it.`}
      </p>
      {photos.length > 0 && (
        <ul className="photogrid">
          {photos.map((src, i) => (
            <li key={src}>
              <span className="photothumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage */}
                <img src={src} alt={`Work photo ${i + 1} of ${photos.length}`} loading="lazy" style={i === 0 ? coverStyle(provider.coverCrop) : undefined} />
              </span>
              {i === 0 && <span className="covertag">Cover</span>}
              <div className="photoactions">
                {i > 0 ? (
                  <button type="button" disabled={Boolean(busy)} onClick={() => makeCover(src)}>
                    <Star size={14} /> Make cover
                  </button>
                ) : (
                  <button type="button" disabled={Boolean(busy)} onClick={() => setAdjusting(true)}>
                    <Crop size={14} /> Adjust cover
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
      {adjusting && photos.length > 0 && (
        <CoverAdjuster key={photos[0]} src={photos[0]} initial={provider.coverCrop} onSave={(crop) => saveCoverCrop(provider.id, crop)} onClose={closeAdjuster} />
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
        Only add photos you took or have permission to use, and none that show people or addresses without their say-so. We resize them and remove
        location data before they&rsquo;re published. See the <Link href="/terms#businesses">terms for businesses</Link>.
      </p>
    </section>
  );
}
