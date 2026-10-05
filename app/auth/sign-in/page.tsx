"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/store";

export default function SignInPage() {
  const router = useRouter();
  const { signInWithEmail } = useApp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function continueWithEmail() {
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setSending(true);
    const { error: sendError } = await signInWithEmail(value);
    setSending(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    router.push(`/auth/verify?email=${encodeURIComponent(value)}`);
  }

  function skip() {
    router.back();
  }

  return (
    <div className="app-main no-tabbar" style={{ paddingTop: 20, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <button type="button" className="topbar-back" style={{ marginBottom: 16 }} onClick={() => router.back()} aria-label="Back">
        <ChevronLeft size={22} />
      </button>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: "8px 0 4px" }}>Save &amp; share who you trust</h2>
        <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 20px" }}>
          Browsing is open to everyone. An account ties reviews and recommendations to a real neighbor — that&rsquo;s what
          keeps them trustworthy.
        </p>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Email address</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && continueWithEmail()}
          />
          {error && <span style={{ fontSize: 12, color: "#b3413a" }}>{error}</span>}
        </div>
        <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 16 }} onClick={continueWithEmail} disabled={sending}>
          {sending ? "Sending email…" : "Continue"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: "var(--color-neutral-500)", fontSize: 11 }}>
          <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          or
          <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
        </div>
        <button type="button" className="btn btn-secondary btn-block" style={{ marginBottom: 10 }} disabled title="Coming soon">
          Continue with Apple
        </button>
        <button type="button" className="btn btn-secondary btn-block" disabled title="Coming soon">
          Continue with Google
        </button>
        <p style={{ fontSize: 11, color: "var(--color-neutral-600)", margin: "16px 0 0" }}>
          We&rsquo;ll email you a sign-in link. Your email is never shown publicly.
        </p>
      </div>
      <button type="button" className="btn btn-ghost btn-block" onClick={skip}>
        Skip for now — just browsing
      </button>
    </div>
  );
}
