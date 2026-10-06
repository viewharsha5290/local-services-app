"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Cover } from "@/components/Cover";
import { useApp } from "@/lib/store";
import { CategoryInfo } from "@/lib/types";
import { ART_OPTIONS } from "@/lib/categories";
import { CategoryIcon, ICON_OPTIONS } from "@/lib/categoryIcons";

const BLANK: CategoryInfo = { name: "", one: "", many: "", hook: "", icon: "briefcase", art: "shop", sortOrder: 100 };

/** Where an admin adds, edits and removes the trades listings are filed under. Hiding this page
 * from non-admins is only a courtesy — the database refuses their writes (migration 012). */
export default function AdminCategoriesPage() {
  const { auth, hydrated, categories, providers, deleteCategory } = useApp();
  const [editing, setEditing] = useState<{ original?: string; draft: CategoryInfo } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Counts cover the city being browsed only; the database has the final say on whether a
  // category is still in use anywhere.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of providers) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [providers]);

  if (!hydrated) return null;
  if (!auth.isAdmin) {
    return (
      <>
        <TopBar back title="Categories" />
        <p style={{ marginTop: 16 }}>This page is for site administrators.</p>
      </>
    );
  }

  async function remove(name: string) {
    setError(null);
    setConfirming(null);
    const result = await deleteCategory(name);
    if (result.error) setError(result.error);
  }

  return (
    <div className="content-narrow">
      <TopBar back title="Categories" />
      {editing ? (
        <CategoryEditor key={editing.original ?? "new"} original={editing.original} initial={editing.draft} onDone={() => setEditing(null)} />
      ) : (
        <>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: 14 }}>
            The trades people browse and file listings under. They appear on the home page in this order.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setEditing({ draft: { ...BLANK, sortOrder: Math.max(0, ...categories.map((c) => c.sortOrder)) + 10 } })}>
            <Plus size={18} /> Add a category
          </button>
          {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: "12px 0 0" }}>{error}</p>}
          <div style={{ marginTop: 12 }}>
            {categories.map((c) => (
              <div key={c.name} className="adminrow">
                <span className="ico">
                  <CategoryIcon icon={c.icon} size={22} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "var(--font-strong-weight)" }}>{c.name}</div>
                  <div className="text-muted" style={{ fontSize: 13.5 }}>{`${counts.get(c.name) ?? 0} listed here`}</div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing({ original: c.name, draft: c })} aria-label={`Edit ${c.name}`}>
                  <Pencil size={15} /> Edit
                </button>
                {confirming === c.name ? (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ color: "var(--color-danger)" }} onClick={() => remove(c.name)}>
                    Confirm delete
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm btn-icon" style={{ width: 38, height: 38 }} onClick={() => setConfirming(c.name)} aria-label={`Delete ${c.name}`}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryEditor({ original, initial, onDone }: { original?: string; initial: CategoryInfo; onDone: () => void }) {
  const { saveCategory } = useApp();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof CategoryInfo>(key: K, value: CategoryInfo[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    const missing = [
      [draft.name, "a name"],
      [draft.one, "the word for one of them"],
      [draft.many, "the word for several"],
      [draft.hook, "a question"],
    ].find(([value]) => value.trim().length < 2);
    if (missing) return setError(`Add ${missing[1]}.`);
    setSaving(true);
    setError(null);
    const result = await saveCategory(draft, original);
    setSaving(false);
    if (result.error) setError(result.error);
    else onDone();
  }

  return (
    <section className="editblock" style={{ borderBottom: 0 }}>
      <h2>{original ? `Edit ${original}` : "New category"}</h2>
      <div className="field">
        <label htmlFor="cat-name">Name</label>
        <input id="cat-name" className="input" maxLength={30} placeholder="e.g. Plumber" value={draft.name} onChange={(e) => set("name", e.target.value)} />
        <span className="hint">{original ? "Renaming also renames it on every listing filed under it." : "Shown on the home page, on listings and in the category list."}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18 }}>
        <div className="field">
          <label htmlFor="cat-one">One of them</label>
          <input id="cat-one" className="input" maxLength={30} placeholder="plumber" value={draft.one} onChange={(e) => set("one", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cat-many">Several of them</label>
          <input id="cat-many" className="input" maxLength={40} placeholder="plumbers" value={draft.many} onChange={(e) => set("many", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="cat-hook">Question on the home page card</label>
        <input id="cat-hook" className="input" maxLength={60} placeholder="e.g. Tap won't stop dripping?" value={draft.hook} onChange={(e) => set("hook", e.target.value)} />
      </div>
      <div className="field">
        <label id="cat-icon-label">Icon</label>
        <div className="pickgrid" role="group" aria-labelledby="cat-icon-label">
          {ICON_OPTIONS.map((o) => (
            <button key={o.key} type="button" className="pick" aria-pressed={draft.icon === o.key} aria-label={o.label} title={o.label} onClick={() => set("icon", o.key)}>
              <o.Icon size={22} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label id="cat-art-label">Cover illustration</label>
        <div className="artgrid" role="group" aria-labelledby="cat-art-label">
          {ART_OPTIONS.map((o) => (
            <button key={o.key} type="button" className="artpick" aria-pressed={draft.art === o.key} onClick={() => set("art", o.key)}>
              <Cover art={o.key} />
              <span className="l">{o.label}</span>
            </button>
          ))}
        </div>
        <span className="hint">Used as the cover for listings in this category that have no photos.</span>
      </div>
      <div className="field">
        <label htmlFor="cat-sort">Position</label>
        <input id="cat-sort" className="input" type="number" style={{ maxWidth: 140 }} value={draft.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
        <span className="hint">Lower numbers come first on the home page.</span>
      </div>
      {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : original ? "Save changes" : "Add category"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDone} disabled={saving}>
          Cancel
        </button>
      </div>
    </section>
  );
}
