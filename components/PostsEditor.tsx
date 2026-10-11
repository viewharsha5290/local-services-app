"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, RefreshCw, Trash2, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { ListingPost, Provider } from "@/lib/types";
import { timeAgo } from "@/lib/time";

const CAPTION_MAX = 280;
const MAX_LIVE = 20;

function daysLeft(post: ListingPost) {
  return Math.ceil((new Date(post.expiresAt).getTime() - Date.now()) / 86400000);
}

/** Where a listing's manager posts "What's new" updates, and renews or removes old ones. */
export function PostsEditor({ provider }: { provider: Provider }) {
  const { fetchListingPosts, createListingPost, renewListingPost, deleteListingPost } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<ListingPost[] | null>(null);
  const [caption, setCaption] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const reload = useCallback(() => fetchListingPosts(provider.id).then(setPosts), [fetchListingPosts, provider.id]);

  useEffect(() => {
    let active = true;
    fetchListingPosts(provider.id).then((list) => active && setPosts(list));
    return () => {
      active = false;
    };
  }, [fetchListingPosts, provider.id]);

  async function run(label: string, action: () => Promise<{ error?: string }>) {
    setBusy(label);
    setError(null);
    setConfirming(null);
    const result = await action();
    if (result.error) setError(result.error);
    else await reload();
    setBusy(null);
    return !result.error;
  }

  async function publish() {
    if (caption.trim().length < 3) return setError("Write a line about what's new.");
    const ok = await run("Posting…", () => createListingPost(provider.id, { caption, price, file }));
    if (ok) {
      setCaption("");
      setPrice("");
      setFile(null);
    }
  }

  const live = posts?.filter((p) => daysLeft(p) > 0).length ?? 0;

  return (
    <section className="editblock">
      <h2>What&rsquo;s new</h2>
      <p className="text-muted" style={{ fontSize: 14, margin: 0 }}>
        Tell people what just came in: new stock, a new service, a seasonal offer. Updates show on your listing for 30 days, then drop off unless you
        renew them.
      </p>
      <div className="field">
        <label htmlFor="post-caption">What&rsquo;s new?</label>
        <textarea
          id="post-caption"
          className="input"
          rows={3}
          maxLength={CAPTION_MAX}
          placeholder="e.g. New Banarasi silk sarees just arrived, in six colours."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <span className="hint">{`${caption.length} / ${CAPTION_MAX}`}</span>
      </div>
      <div className="field">
        <label htmlFor="post-price">Price (optional)</label>
        <input id="post-price" className="input" maxLength={40} placeholder="e.g. from $120" style={{ maxWidth: 260 }} value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>
          <ImagePlus size={18} /> {file ? "Change photo" : "Add a photo"}
        </button>
        {file && (
          <span className="chip" style={{ cursor: "default", paddingRight: 6, maxWidth: "100%" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
            <button type="button" className="chip-x" aria-label="Remove the photo" onClick={() => setFile(null)}>
              <X size={15} />
            </button>
          </span>
        )}
      </div>
      {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={publish} disabled={Boolean(busy) || live >= MAX_LIVE}>
          Post update
        </button>
        <span role="status" style={{ fontSize: 14 }}>{busy ?? (live >= MAX_LIVE ? `You have ${MAX_LIVE} live updates, the most a listing can show. Delete one to post another.` : "")}</span>
      </div>
      <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
        Keep prices and stock accurate, and only use photos that are yours. See the <Link href="/terms#businesses">terms for businesses</Link>.
      </p>

      {posts === null ? (
        <p className="text-muted" style={{ margin: 0 }}>Loading your updates…</p>
      ) : posts.length === 0 ? null : (
        <ul className="postlist">
          {posts.map((p) => {
            const left = daysLeft(p);
            return (
              <li key={p.id}>
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage
                  <img src={p.photo} alt="" loading="lazy" />
                ) : (
                  <span className="noimg" aria-hidden="true" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, overflowWrap: "anywhere" }}>{p.caption}</div>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    {[p.price, `posted ${timeAgo(new Date(p.createdAt).getTime())}`, left > 0 ? `${left} ${left === 1 ? "day" : "days"} left` : "expired, no longer shown"]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="review-actions">
                    <button type="button" disabled={Boolean(busy)} onClick={() => run("Renewing…", () => renewListingPost(p.id))}>
                      <RefreshCw size={14} /> {left > 0 ? "Renew for 30 days" : "Show again for 30 days"}
                    </button>
                    {confirming === p.id ? (
                      <button type="button" style={{ color: "var(--color-danger)" }} disabled={Boolean(busy)} onClick={() => run("Deleting…", () => deleteListingPost(p))}>
                        <Trash2 size={14} /> Confirm delete
                      </button>
                    ) : (
                      <button type="button" disabled={Boolean(busy)} onClick={() => setConfirming(p.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
