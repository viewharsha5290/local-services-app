"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/store";

type Mode = "signup" | "signin";

export default function SignInPage() {
  const router = useRouter();
  const { signInWithEmail } = useApp();
  // Most visitors arriving here are new, so creating an account is the default.
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
  }

  async function submit() {
    const emailValue = email.trim();
    const nameValue = name.trim().replace(/\s+/g, " ");
    if (mode === "signup" && nameValue.length < 2) {
      setError("Enter your name");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(emailValue)) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setNotice(null);
    setSending(true);
    const result = await signInWithEmail(emailValue, mode === "signup" ? nameValue : undefined);
    setSending(false);
    if (result.noAccount) {
      setMode("signup");
      setNotice("There's no account with that email yet — add your name to create one.");
      return;
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/auth/verify?email=${encodeURIComponent(emailValue)}`);
  }

  const onEnter = (e: React.KeyboardEvent) => e.key === "Enter" && submit();

  return (
    <div className="app-main no-tabbar" style={{ paddingTop: 20, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <button type="button" className="topbar-back" style={{ marginBottom: 16 }} onClick={() => router.back()} aria-label="Back">
        <ChevronLeft size={22} />
      </button>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: "8px 0 4px" }}>{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 20px" }}>
          {mode === "signup"
            ? "Browsing is open to everyone. An account ties reviews and recommendations to a real neighbor — that's what keeps them trustworthy."
            : "Enter the email you signed up with and we'll send you a sign-in link."}
        </p>
        {notice && <p style={{ fontSize: 12.5, margin: "0 0 12px", color: "var(--color-accent-700)" }}>{notice}</p>}
        {mode === "signup" && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="signup-name">Your name</label>
            <input
              id="signup-name"
              className="input"
              type="text"
              autoComplete="name"
              maxLength={60}
              placeholder="e.g. Priya S."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onEnter}
            />
            <span style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>Shown publicly on your reviews and recommendations.</span>
          </div>
        )}
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="signin-email">Email address</label>
          <input
            id="signin-email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onEnter}
          />
          {error && <span style={{ fontSize: 12, color: "#b3413a" }}>{error}</span>}
        </div>
        <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 12 }} onClick={submit} disabled={sending}>
          {sending ? "Sending email…" : mode === "signup" ? "Create account" : "Send sign-in link"}
        </button>
        <p style={{ fontSize: 12.5, margin: "0 0 16px", textAlign: "center" }}>
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: 0, display: "inline", minHeight: 0 }}
            onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
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
          No password needed — we&rsquo;ll email you a sign-in link and code. Your email is never shown publicly.
        </p>
      </div>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => router.back()}>
        Skip for now — just browsing
      </button>
    </div>
  );
}
