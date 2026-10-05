"use client";

import { useState } from "react";
import { Provider } from "@/lib/types";
import { useApp } from "@/lib/store";
import { useSheet } from "@/components/SheetProvider";

const ROLES = ["Owner", "Manager", "Employee authorized to manage this listing"];

export function ClaimSheet({ provider }: { provider: Provider }) {
  const { submitClaim } = useApp();
  const { close } = useSheet();
  const [roleTitle, setRoleTitle] = useState(ROLES[0]);
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    setSending(true);
    const result = await submitClaim({ providerId: provider.id, roleTitle, contactPhone: contactPhone.trim(), note: note.trim() });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div>
        <h3 style={{ margin: "4px 0 6px" }}>Claim submitted</h3>
        <p style={{ fontSize: 12.5, opacity: 0.75, margin: "0 0 16px" }}>
          {`We’ll confirm it with ${provider.name} before approving — usually by calling the number on the listing. You’ll see the result on this page.`}
        </p>
        <button type="button" className="btn btn-primary btn-block" onClick={close}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ margin: "4px 0 4px" }}>Claim {provider.name}</h3>
      <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 16px" }}>
        Claiming lets you manage this listing. To protect businesses, we confirm every claim
        {provider.phone ? ` by calling ${provider.phoneDisplay}` : ""} before approving it.
      </p>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="claim-role">Your role at this business</label>
        <select id="claim-role" className="input" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="claim-phone">Best number to reach you (optional)</label>
        <input
          id="claim-phone"
          className="input"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="(416) 000-0000"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
      </div>
      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="claim-note">Anything that helps us confirm it&rsquo;s you (optional)</label>
        <textarea
          id="claim-note"
          className="input"
          rows={3}
          maxLength={500}
          placeholder="e.g. Ask for Sam at the front desk, weekdays 9–5."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "#b3413a", margin: "0 0 12px" }}>{error}</p>}
      <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 10 }} onClick={submit} disabled={sending}>
        {sending ? "Submitting…" : "Submit claim"}
      </button>
      <button type="button" className="btn btn-ghost btn-block" onClick={close}>
        Cancel
      </button>
    </div>
  );
}
