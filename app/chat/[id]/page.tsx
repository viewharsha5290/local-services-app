"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Send, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";

interface Message {
  id: string;
  from: "me" | "them";
  text: string;
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getProvider } = useApp();
  const provider = getProvider(params.id);

  const [messages, setMessages] = useState<Message[]>([
    { id: "m1", from: "me", text: `Hi — do you have time this week for a quote? Would appreciate the help.` },
    { id: "m2", from: "them", text: `Hi! Yes — Thursday 9am or Friday 2pm work?` },
  ]);
  const [draft, setDraft] = useState("");

  if (!provider) {
    return (
      <div className="app-main no-tabbar" style={{ paddingTop: 20 }}>
        <p>This conversation isn&rsquo;t available.</p>
        <button type="button" className="btn btn-secondary" onClick={() => router.push("/search")}>
          Back to search
        </button>
      </div>
    );
  }

  if (!provider.claimed) {
    return (
      <div className="app-main no-tabbar" style={{ paddingTop: 20 }}>
        <p>{provider.name} hasn&rsquo;t claimed their profile yet, so in-app chat isn&rsquo;t available. Use Call, WhatsApp or SMS instead.</p>
        <button type="button" className="btn btn-secondary" onClick={() => router.push(`/provider/${provider.id}`)}>
          Back to profile
        </button>
      </div>
    );
  }

  function send() {
    if (!draft.trim()) return;
    setMessages((m) => [...m, { id: `m${m.length + 1}`, from: "me", text: draft.trim() }]);
    setDraft("");
  }

  return (
    <div className="app-main no-tabbar" style={{ paddingTop: 12, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--color-divider)" }}>
        <button type="button" className="topbar-back" onClick={() => router.back()} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {provider.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-neutral-600)" }}>{provider.respondsWithin ?? "Usually replies within a day"}</div>
        </div>
        <span className="tag tag-accent" style={{ display: "flex", alignItems: "center", gap: 3, flex: "none" }}>
          <ShieldCheck size={11} /> Claimed
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--color-neutral-500)" }}>Today</div>
        {messages.map((m) => (
          <div key={m.id} className={`msg-bubble ${m.from === "me" ? "me" : "them"}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="pill-input-row" style={{ padding: "10px 0 20px", borderTop: "1px solid var(--color-divider)" }}>
        <input
          className="input"
          placeholder="Message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button type="button" className="btn btn-icon btn-primary" aria-label="Send message" onClick={send}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
