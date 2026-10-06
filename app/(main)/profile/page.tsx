"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { ThemePicker } from "@/components/ThemePicker";
import { useApp } from "@/lib/store";

export default function ProfilePage() {
  const { auth, locationLabel, savedIds, trustStats, signOut, myListings } = useApp();
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
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14.5, marginBottom: 16 }}>
              {["Write reviews & recommend providers", "Keep saved providers in sync", "Build a trusted-neighbour track record"].map((line) => (
                <div key={line} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ShieldCheck size={17} color="var(--color-brand-ink)" style={{ flex: "none" }} />
                  {line}
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={() => router.push("/auth/sign-in")}>
              Sign in or create account
            </button>
          </div>
          <Appearance />
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
            <div className="card-title" style={{ fontSize: 20 }}>{auth.name}</div>
            <div style={{ fontSize: 14, color: "var(--color-muted)" }}>{locationLabel}</div>
          </div>
        </div>
        {trustStats.isTrusted && (
          <span className="tag tag-accent" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
            <ShieldCheck size={11} /> Trusted neighbour
          </span>
        )}
        <div className="card blueprint" style={{ marginBottom: 18 }}>
          <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <div style={{ display: "flex", textAlign: "center" }}>
            <Stat value={trustStats.recommendations} label="Recommendations" />
            <Stat value={trustStats.reviews} label="Reviews" border />
            <Stat value={trustStats.neighborsHelped} label="Neighbours helped" border />
          </div>
        </div>
        <Appearance />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="list-row" style={{ cursor: "default" }}>
            My recommendations<span className="v">{trustStats.recommendations}</span>
          </div>
          <div className="list-row" style={{ cursor: "default" }}>
            My reviews<span className="v">{trustStats.reviews}</span>
          </div>
          {myListings.map((l) => (
            <button key={l.providerId} type="button" className="list-row" onClick={() => router.push(`/provider/${l.providerId}`)}>
              {`Your listing: ${l.providerName}`}
              <span className="v">{`${l.last30Days} ${l.last30Days === 1 ? "contact" : "contacts"} this month`}</span>
            </button>
          ))}
          {auth.isAdmin && (
            <>
              <button type="button" className="list-row" onClick={() => router.push("/admin/claims")}>
                Review listing claims<span className="v">Admin</span>
              </button>
              <button type="button" className="list-row" onClick={() => router.push("/admin/messages")}>
                Messages from the contact form<span className="v">Admin</span>
              </button>
              <button type="button" className="list-row" onClick={() => router.push("/admin/categories")}>
                Manage categories<span className="v">Admin</span>
              </button>
            </>
          )}
          <button type="button" className="list-row" onClick={() => router.push("/saved")}>
            Saved providers<span className="v">{savedIds.length}</span>
          </button>
          <button type="button" className="list-row" onClick={() => router.push("/onboarding?change=1")}>
            Change location<span className="v">{locationLabel}</span>
          </button>
          <button type="button" className="list-row" onClick={() => router.push("/contact")}>
            Contact us<span className="v" />
          </button>
          <button type="button" className="list-row" onClick={() => router.push("/terms")}>
            Terms and privacy<span className="v" />
          </button>
          <button
            type="button"
            className="list-row"
            style={{ color: "var(--color-brand-ink)", fontWeight: "var(--font-strong-weight)" }}
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
    <div style={{ flex: 1, borderLeft: border ? "1px solid var(--color-line)" : undefined, padding: "4px 0" }}>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: "var(--font-heading-weight)", fontSize: 22 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: "var(--color-muted)" }}>{label}</div>
    </div>
  );
}

function Appearance() {
  return (
    <section style={{ margin: "8px 0 18px" }}>
      <div className="section-label">Theme</div>
      <ThemePicker />
    </section>
  );
}

function SettingsList({ locationLabel }: { locationLabel: string | null }) {
  const router = useRouter();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <button type="button" className="list-row" onClick={() => router.push("/onboarding?change=1")}>
        Change location<span className="v">{locationLabel}</span>
      </button>
      <button type="button" className="list-row" onClick={() => router.push("/contact")}>
        Contact us<span className="v" />
      </button>
      <button type="button" className="list-row" onClick={() => router.push("/terms")}>
        Terms and privacy<span className="v" />
      </button>
    </div>
  );
}
