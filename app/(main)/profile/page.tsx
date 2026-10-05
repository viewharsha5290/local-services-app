"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useApp } from "@/lib/store";

export default function ProfilePage() {
  const { auth, locationLabel, savedIds, trustStats, signOut } = useApp();
  const router = useRouter();
  const initials =
    auth.name
      ?.split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "N";

  if (auth.status === "guest") {
    return (
      <>
        <TopBar title="Profile" />
        <div className="content-narrow" style={{ paddingTop: 4 }}>
          <div className="card blueprint" style={{ marginBottom: 18 }}>
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <div className="card-title">You&rsquo;re browsing as a guest</div>
            <div className="card-body" style={{ marginBottom: 12 }}>Everything stays readable without an account. Sign in when you want to contribute:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 12.5, marginBottom: 16 }}>
              {["Write reviews & recommend providers", "Keep saved providers in sync", "Build a trusted-neighbor track record"].map((line) => (
                <div key={line} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ShieldCheck size={14} color="var(--color-accent-700)" style={{ flex: "none" }} />
                  {line}
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={() => router.push("/auth/sign-in")}>
              Sign in or create account
            </button>
          </div>
          <SettingsList locationLabel={locationLabel} />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Profile" />
      <div className="content-narrow" style={{ paddingTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div className="avatar">{initials}</div>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 17 }}>{auth.name}</div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>{locationLabel}</div>
          </div>
        </div>
        {trustStats.isTrusted && (
          <span className="tag tag-accent" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            <ShieldCheck size={11} /> Trusted neighbor
          </span>
        )}
        <div className="card blueprint" style={{ marginBottom: 18 }}>
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <div style={{ display: "flex", textAlign: "center" }}>
            <Stat value={trustStats.recommendations} label="Recommendations" />
            <Stat value={trustStats.reviews} label="Reviews" border />
            <Stat value={trustStats.neighborsHelped} label="Neighbors helped" border />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="list-row" style={{ cursor: "default" }}>
            My recommendations<span className="v">{trustStats.recommendations}</span>
          </div>
          <div className="list-row" style={{ cursor: "default" }}>
            My reviews<span className="v">{trustStats.reviews}</span>
          </div>
          <button type="button" className="list-row" onClick={() => router.push("/saved")}>
            Saved providers<span className="v">{savedIds.length}</span>
          </button>
          <button type="button" className="list-row" onClick={() => router.push("/onboarding?change=1")}>
            Change location<span className="v">{locationLabel}</span>
          </button>
          <div className="list-row" style={{ cursor: "default" }}>
            Language<span className="v">English</span>
          </div>
          <div className="list-row" style={{ cursor: "default" }}>
            Notifications<span className="v">On</span>
          </div>
          <button
            type="button"
            className="list-row"
            style={{ color: "var(--color-accent-700)" }}
            onClick={() => {
              signOut();
              router.push("/search");
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

function Stat({ value, label, border }: { value: number; label: string; border?: boolean }) {
  return (
    <div style={{ flex: 1, borderLeft: border ? "1px solid var(--color-divider)" : undefined, padding: "4px 0" }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>{label}</div>
    </div>
  );
}

function SettingsList({ locationLabel }: { locationLabel: string | null }) {
  const router = useRouter();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <button type="button" className="list-row" onClick={() => router.push("/onboarding?change=1")}>
        Change location<span className="v">{locationLabel}</span>
      </button>
      <div className="list-row" style={{ cursor: "default" }}>
        Language<span className="v">English</span>
      </div>
      <div className="list-row" style={{ cursor: "default" }}>
        About &amp; privacy<span className="v" />
      </div>
    </div>
  );
}
