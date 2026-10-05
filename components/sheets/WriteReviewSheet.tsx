"use client";

import { useState } from "react";
import { Provider } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useSheet } from "@/components/SheetProvider";
import { StarPicker } from "@/components/Stars";

const STOOD_OUT_TAGS = ["Fair price", "On time", "Good communication", "Reliable", "Went above and beyond"];

export function WriteReviewSheet({ provider }: { provider: Provider }) {
  const { addReview } = useApp();
  const { close } = useSheet();
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");

  function toggleTag(tag: string) {
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));
  }

  function submit() {
    addReview({ providerId: provider.id, rating, tags, text: text.trim() });
    close();
  }

  return (
    <div>
      <h3 style={{ margin: "4px 0 4px" }}>Rate {provider.name}</h3>
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
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="field" style={{ marginBottom: 20 }}>
        <label>Your review</label>
        <textarea
          className="input"
          rows={4}
          placeholder="What made you recommend them?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Post review
      </button>
    </div>
  );
}
