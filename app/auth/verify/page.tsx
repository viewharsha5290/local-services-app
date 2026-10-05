"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useApp } from "@/lib/store";
import { useActionResolver } from "@/lib/useActions";
import { PendingAction } from "@/lib/types";

function destinationFor(action: PendingAction) {
  if (action?.type === "save" || action?.type === "review") return `/provider/${action.providerId}`;
  if (action?.type === "recommend") return "/search";
  return "/profile";
}

const subscribeNever = () => () => {};

function readLinkError() {
  const description = new URLSearchParams(window.location.hash.slice(1)).get("error_description");
  return description ? `${description}. Request a new email to try again.` : null;
}

function VerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const { auth, hydrated, signInWithEmail, verifyEmailCode, consumePendingAction } = useApp();
  const resolve = useActionResolver();
  const [digits, setDigits] = useState("");
  const [seconds, setSeconds] = useState(24);
  const [error, setError] = useState<string | null>(null);
  // An expired or already-used email link lands here with the reason in the URL hash. Read via
  // useSyncExternalStore so the server render (which has no hash) and hydration agree.
  const linkError = useSyncExternalStore(subscribeNever, readLinkError, () => null);
  const [verifying, setVerifying] = useState(false);
  const resumed = useRef(false);

  // Runs once the user is signed in — by entering the code here, or by arriving via the email
  // link (supabase-js picks the session out of the URL). Doing it from an effect rather than
  // straight after verifyEmailCode means `resolve` sees the signed-in state, not a stale guest one.
  useEffect(() => {
    if (!hydrated || auth.status !== "signedIn" || resumed.current) return;
    resumed.current = true;
    const action = consumePendingAction();
    resolve(action);
    router.replace(destinationFor(action));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, auth.status]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function verify() {
    if (digits.length < 6 || !email) return;
    setError(null);
    setVerifying(true);
    const { error: verifyError } = await verifyEmailCode(email, digits);
    setVerifying(false);
    if (verifyError) {
      setError("That code didn't work — check your email and try again.");
    }
  }

  async function resend() {
    // Arriving via an expired link, there is no address to resend to — start over.
    if (!email) {
      router.replace("/auth/sign-in");
      return;
    }
    setSeconds(24);
    await signInWithEmail(email);
  }

  function onKeyInput(value: string) {
    setDigits(value.replace(/\D/g, "").slice(0, 6));
  }

  return (
    <div className="app-main no-tabbar" style={{ paddingTop: 20, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <button type="button" className="topbar-back" style={{ marginBottom: 16 }} onClick={() => router.back()} aria-label="Back">
        <ChevronLeft size={22} />
      </button>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: "0 0 4px" }}>Verify your email</h2>
        <p style={{ fontSize: 13, opacity: 0.75, margin: "0 0 24px" }}>
          We emailed {email || "your address"}. Click the sign-in link in that email, or enter the 6-digit code if it shows one.
        </p>
        <div style={{ position: "relative", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`code-box ${digits[i] ? "filled" : ""}`}>
                {digits[i] ?? ""}
              </div>
            ))}
          </div>
          <input
            autoFocus
            value={digits}
            onChange={(e) => onKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            inputMode="numeric"
            aria-label="Verification code"
            style={{ position: "absolute", inset: 0, opacity: 0 }}
          />
        </div>
        {(error ?? linkError) && <p style={{ fontSize: 12, color: "#b3413a", margin: "0 0 12px" }}>{error ?? linkError}</p>}
        <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
          {seconds > 0 ? (
            `Resend email in 0:${seconds.toString().padStart(2, "0")}`
          ) : (
            <button type="button" className="btn btn-ghost" style={{ padding: 0 }} onClick={resend}>
              Resend email
            </button>
          )}
        </div>
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled={digits.length < 6 || verifying} onClick={verify}>
        {verifying ? "Verifying…" : "Verify & continue"}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
