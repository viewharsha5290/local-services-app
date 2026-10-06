"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { useApp } from "@/lib/store";
import { ContactMessage, ContactTopic } from "@/lib/types";
import { timeAgo } from "@/lib/time";

const TOPIC_LABELS: Record<ContactTopic, string> = {
  category: "Category suggestion",
  listing: "Add or fix a listing",
  remove: "Remove or correct a listing",
  review: "Report a review",
  privacy: "Account or data request",
  problem: "Something isn't working",
  other: "Other",
};

/** The inbox for the contact form. Hiding this page from non-admins is only a courtesy — the
 * database returns the messages to admins alone (migration 012). */
export default function AdminMessagesPage() {
  const { auth, hydrated, fetchContactMessages, setMessageHandled, deleteContactMessage } = useApp();
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHandled, setShowHandled] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isAdmin) return;
    let active = true;
    fetchContactMessages().then((result) => {
      if (!active) return;
      setError(result.error ?? null);
      setMessages(result.messages);
    });
    return () => {
      active = false;
    };
  }, [auth.isAdmin, fetchContactMessages]);

  if (!hydrated) return null;
  if (!auth.isAdmin) {
    return (
      <>
        <TopBar back title="Messages" />
        <p style={{ marginTop: 16 }}>This page is for site administrators.</p>
      </>
    );
  }

  async function toggle(m: ContactMessage) {
    const result = await setMessageHandled(m.id, !m.handled);
    if (result.error) return setError(result.error);
    setMessages((list) => list?.map((x) => (x.id === m.id ? { ...x, handled: !m.handled } : x)) ?? null);
  }

  async function remove(m: ContactMessage) {
    setConfirming(null);
    const result = await deleteContactMessage(m.id);
    if (result.error) return setError(result.error);
    setMessages((list) => list?.filter((x) => x.id !== m.id) ?? null);
  }

  const open = messages?.filter((m) => !m.handled) ?? [];
  const shown = showHandled ? (messages ?? []) : open;

  return (
    <div className="content-narrow">
      <TopBar back title="Messages" subtitle={messages ? `${open.length} waiting` : undefined} />
      <p className="text-muted" style={{ fontSize: 14, marginBottom: 14 }}>
        Sent through the contact page. Reply from your own email, then mark the message as dealt with.
      </p>
      <label className="checkrow" style={{ marginBottom: 16 }}>
        <input type="checkbox" checked={showHandled} onChange={(e) => setShowHandled(e.target.checked)} />
        <span>Also show messages already dealt with</span>
      </label>
      {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: "0 0 12px" }}>{error}</p>}
      {messages === null ? (
        <p className="text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-muted">{messages.length === 0 ? "No messages yet." : "Nothing waiting. You're all caught up."}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shown.map((m) => (
            <div key={m.id} className="card" style={{ gap: 8, opacity: m.handled ? 0.7 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span className="tag tag-accent">{TOPIC_LABELS[m.topic] ?? m.topic}</span>
                <span className="text-muted" style={{ fontSize: 12.5, flex: "none" }}>{timeAgo(new Date(m.createdAt).getTime())}</span>
              </div>
              <div style={{ fontSize: 14.5 }}>
                <strong>{m.name}</strong> · {m.email}
              </div>
              <div style={{ fontSize: 15, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.message}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <a
                  className="btn btn-primary btn-sm"
                  href={`mailto:${m.email}?subject=${encodeURIComponent("Your message to The Local Services")}&body=${encodeURIComponent(`Hi ${m.name},\n\n\n\n> ${m.message.replace(/\n/g, "\n> ")}`)}`}
                >
                  <Mail size={15} /> Reply by email
                </a>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggle(m)}>
                  {m.handled ? "Mark as waiting" : "Mark as dealt with"}
                </button>
                {confirming === m.id ? (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ color: "var(--color-danger)" }} onClick={() => remove(m)}>
                    Confirm delete
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(m.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
