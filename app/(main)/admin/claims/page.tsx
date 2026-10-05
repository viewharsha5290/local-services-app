"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useApp } from "@/lib/store";
import { PendingClaim } from "@/lib/types";
import { timeAgo } from "@/lib/time";

/** Review queue for listing claims. Hiding this page from non-admins is only a courtesy — the
 * database functions behind it refuse anyone whose profile isn't flagged is_admin. */
export default function AdminClaimsPage() {
  const { auth, hydrated, fetchPendingClaims, reviewClaim } = useApp();
  const [claims, setClaims] = useState<PendingClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchPendingClaims();
    setError(result.error ?? null);
    setClaims(result.claims);
  }, [fetchPendingClaims]);

  useEffect(() => {
    if (!auth.isAdmin) return;
    let active = true;
    fetchPendingClaims().then((result) => {
      if (!active) return;
      setError(result.error ?? null);
      setClaims(result.claims);
    });
    return () => {
      active = false;
    };
  }, [auth.isAdmin, fetchPendingClaims]);

  async function decide(claim: PendingClaim, approve: boolean) {
    const question = approve
      ? `Approve ${claim.claimantName} (${claim.claimantEmail}) as the manager of ${claim.providerName}?`
      : `Reject this claim on ${claim.providerName}?`;
    if (!window.confirm(question)) return;
    setBusyId(claim.id);
    const result = await reviewClaim(claim.id, approve);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await load();
  }

  if (!hydrated) return null;

  if (!auth.isAdmin) {
    return (
      <>
        <TopBar back title="Listing claims" />
        <p style={{ marginTop: 16, fontSize: 13 }}>This page is for site administrators.</p>
      </>
    );
  }

  return (
    <>
      <TopBar back title="Listing claims" />
      <div className="content-narrow" style={{ paddingTop: 4 }}>
        <p style={{ fontSize: 12.5, color: "var(--color-neutral-600)", margin: "0 0 14px" }}>
          Confirm each claim with the business — call the number on the listing, not the one the claimant gave — before approving. Approval
          hands them control of the listing.
        </p>
        {error && <p style={{ fontSize: 12.5, color: "#b3413a", margin: "0 0 12px" }}>{error}</p>}
        {claims === null ? (
          <p style={{ fontSize: 13, opacity: 0.7 }}>Loading…</p>
        ) : claims.length === 0 ? (
          <p style={{ fontSize: 13, opacity: 0.7 }}>No claims waiting for review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {claims.map((c) => (
              <div key={c.id} className="card" style={{ gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <Link href={`/provider/${c.providerId}`} className="card-title">
                    {c.providerName}
                  </Link>
                  <span style={{ fontSize: 11, color: "var(--color-neutral-500)", flex: "none" }}>{timeAgo(new Date(c.createdAt).getTime())}</span>
                </div>
                <div className="card-meta">Listing phone: {c.providerPhone ?? "none on file"}</div>
                <div style={{ fontSize: 13 }}>
                  <strong>{c.claimantName}</strong> · {c.claimantEmail}
                  <br />
                  {c.roleTitle}
                  {c.contactPhone ? ` · their number: ${c.contactPhone}` : ""}
                </div>
                {c.note && <div className="card-body">&ldquo;{c.note}&rdquo;</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busyId === c.id} onClick={() => decide(c, true)}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} disabled={busyId === c.id} onClick={() => decide(c, false)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
