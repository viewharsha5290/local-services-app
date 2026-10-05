"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ProviderCard } from "@/components/ProviderCard";
import { useApp } from "@/lib/store";

export default function SavedPage() {
  const { providers, savedIds } = useApp();
  const saved = providers.filter((p) => savedIds.includes(p.id));

  return (
    <>
      <TopBar title="Saved" />
      <div style={{ paddingTop: 4 }}>
        {saved.length === 0 ? (
          <div className="empty-state">
            <Bookmark size={40} strokeWidth={1.4} />
            <h3 style={{ margin: "14px 0 6px" }}>No saved providers yet</h3>
            <p style={{ fontSize: 12.5, opacity: 0.7, margin: "0 0 22px" }}>
              Tap the bookmark on any provider to keep them here.
            </p>
            <Link href="/search" className="btn btn-primary btn-block">
              Browse providers
            </Link>
          </div>
        ) : (
          <div className="provider-list">
            {saved.map((p) => (
              <ProviderCard key={p.id} provider={p} showCategory />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
