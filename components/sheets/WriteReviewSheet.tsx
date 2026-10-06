"use client";

import { useState } from "react";
import { Provider, Review } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useSheet } from "@/components/SheetProvider";
import { StarPicker } from "@/components/Stars";

const STOOD_OUT_TAGS = ["Fair price", "On time", "Good communication", "Reliable", "Went above and beyond"];

/** Writes a new review, or edits `review` when one of the signed-in user's own is passed in. */
export function WriteReviewSheet({ provider, review }: { provider: Provider; review?: Review }) {
  const { addReview, updateReview } = useApp();
  const { close } = useSheet();
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [tags, setTags] = useState<string[]>(review?.tags ?? []);
  const [text, setText] = useState(review?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  async function submit() {
    if (!review) {
      addReview({ providerId: provider.id, rating, tags, text: text.trim() });
      close();
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateReview(review.id, { providerId: provider.id, rating, tags, text: text.trim() });
    setSaving(false);
    if (result.error) setError(result.error);
    else close();
  }

  return (
    <div>
      <h3 style={{ margin: "4px 0 4px" }}>{review ? `Edit your review of ${provider.name}` : `Rate ${provider.name}`}</h3>
      <div style={{ margin: "16px 0 20px" }}>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div className="section-label">What stood out?</div>
      <div className="chip-row" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        {STOOD_OUT_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`tag ${tags.includes(tag) ? "tag-accent" : "tag-outline"}`}
            aria-pressed={tags.includes(tag)}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginBottom: 20 }}>
        <label htmlFor="review-text">Your review</label>
        <textarea
          id="review-text"
          className="input"
          rows={4}
          placeholder="What made you recommend them?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <span style={{ fontSize: 13, color: "var(--color-danger)" }}>{error}</span>}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit} disabled={saving}>
        {review ? (saving ? "Saving…" : "Save changes") : "Post review"}
      </button>
    </div>
  );
}

/** Deleting can't be undone, so it asks first. */
export function DeleteReviewSheet({ provider, review }: { provider: Provider; review: Review }) {
  const { deleteReview } = useApp();
  const { close } = useSheet();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setDeleting(true);
    setError(null);
    const result = await deleteReview(review.id, provider.id);
    setDeleting(false);
    if (result.error) setError(result.error);
    else close();
  }

  return (
    <div>
      <h3 style={{ margin: "4px 0 6px" }}>Delete your review?</h3>
      <p className="text-muted" style={{ fontSize: 14.5, marginBottom: 18 }}>
        {`Your review of ${provider.name} will be removed for everyone. This can't be undone.`}
      </p>
      {error && <p style={{ fontSize: 13, color: "var(--color-danger)" }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={close} disabled={deleting}>
          Keep it
        </button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={confirm} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete review"}
        </button>
      </div>
    </div>
  );
}
