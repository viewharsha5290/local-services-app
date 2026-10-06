"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useSheet } from "@/components/SheetProvider";
import { StarPicker } from "@/components/Stars";
import Link from "next/link";

export function RecommendSheet({ navigateOnSubmit = true }: { navigateOnSubmit?: boolean }) {
  const { addRecommendation, categories } = useApp();
  const { close } = useSheet();
  const router = useRouter();
  const [name, setName] = useState("");
  // No default: filing someone under the first trade in the list by accident helps nobody.
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [note, setNote] = useState("");

  const canSubmit = name.trim().length > 1 && note.trim().length > 3 && category !== "";

  async function submit() {
    if (!canSubmit) return;
    const id = await addRecommendation({ name: name.trim(), category, phone: phone.trim(), rating, note: note.trim() });
    close();
    if (navigateOnSubmit && id) router.push(`/provider/${id}`);
  }

  return (
    <div>
      <h3 style={{ margin: "4px 0 4px" }}>Recommend a provider</h3>
      <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 16px" }}>Not in the directory yet? Add them.</p>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Name / business</label>
        <input className="input" placeholder="e.g. Sarah Kaur, CPA" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="recommend-category">Category</label>
        <select id="recommend-category" className="input" required value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="hint">
          Don&rsquo;t see the right one?{" "}
          <Link href="/contact?topic=category" onClick={close}>
            Suggest a category
          </Link>
        </span>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Phone number</label>
        <input className="input" placeholder="(416) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label>Your rating</label>
        <StarPicker value={rating} onChange={setRating} size={22} />
      </div>
      <div className="field" style={{ marginBottom: 20 }}>
        <label>Why do you recommend them?</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Showed up on time, fair price, spoke Punjabi..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <p className="legal">
        Only recommend a business you&rsquo;ve used yourself, and only share the number it gives out to customers. Your recommendation is public and
        shows your name. By posting you agree to the{" "}
        <Link href="/terms#reviews" onClick={close}>
          review rules
        </Link>
        .
      </p>
      <button type="button" className="btn btn-primary btn-block" disabled={!canSubmit} onClick={submit}>
        Post recommendation
      </button>
    </div>
  );
}
