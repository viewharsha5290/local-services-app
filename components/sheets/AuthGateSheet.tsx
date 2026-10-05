"use client";

import { useRouter } from "next/navigation";
import { useSheet } from "@/components/SheetProvider";
import { useApp } from "@/lib/store";

const COPY: Record<string, { title: string; body: string }> = {
  save: {
    title: "Sign in to save providers",
    body: "Saved providers sync across your devices. Takes about 30 seconds — your pick is kept.",
  },
  review: {
    title: "Sign in to post your review",
    body: "Reviews here come from real neighbors, not anonymous accounts. Takes about 30 seconds — your draft is kept.",
  },
  recommend: {
    title: "Sign in to recommend a provider",
    body: "Recommendations are tied to a real neighbor — that's what keeps them trustworthy. Takes about 30 seconds.",
  },
};

export function AuthGateSheet({ reason }: { reason: "save" | "review" | "recommend" }) {
  const { close } = useSheet();
  const { setPendingAction } = useApp();
  const router = useRouter();
  const copy = COPY[reason];

  function notNow() {
    setPendingAction(null);
    close();
  }

  function signIn() {
    close();
    router.push("/auth/sign-in");
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 6px" }}>{copy.title}</h3>
      <p style={{ fontSize: 12.5, opacity: 0.75, margin: "0 0 16px" }}>{copy.body}</p>
      <button type="button" className="btn btn-primary btn-block" style={{ marginBottom: 10 }} onClick={signIn}>
        Sign in or create account
      </button>
      <button type="button" className="btn btn-ghost btn-block" onClick={notNow}>
        Not now
      </button>
    </div>
  );
}
