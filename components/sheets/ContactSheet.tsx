"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, MessageCircle, MessageSquareText, Phone, Send } from "lucide-react";
import { Provider } from "@/lib/types";
import { useApp } from "@/lib/store";
import { CHAT_ENABLED } from "@/lib/data";
import { useSheet } from "@/components/SheetProvider";

export function ContactSheet({ provider }: { provider: Provider }) {
  const { logContact } = useApp();
  const { close } = useSheet();
  const router = useRouter();
  const chatAvailable = CHAT_ENABLED && provider.claimed;

  function go(method: "whatsapp" | "sms" | "call" | "chat") {
    logContact(provider.id, provider.name, method);
    close();
    const digits = provider.phone.replace(/[^\d+]/g, "");
    if (method === "whatsapp") window.open(`https://wa.me/${digits.replace("+", "")}`, "_blank");
    else if (method === "sms") window.location.href = `sms:${digits}`;
    else if (method === "call") window.location.href = `tel:${digits}`;
    else if (method === "chat") router.push(`/chat/${provider.id}`);
  }

  return (
    <div>
      <h3 style={{ margin: "0 0 4px" }}>Contact {provider.name}</h3>
      <p style={{ fontSize: 12, opacity: 0.7, margin: "0 0 8px" }}>
        {chatAvailable
          ? "Message in-app, or reach them directly — providers don't need this app installed."
          : "Opens your chat app — providers don't need this app installed."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 14 }}>
        {chatAvailable && (
          <button type="button" className="list-row" onClick={() => go("chat")}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Send size={18} color="var(--color-accent-700)" />
              Chat in app
            </span>
            <ChevronRight size={14} color="var(--color-neutral-500)" />
          </button>
        )}
        <button type="button" className="list-row" onClick={() => go("whatsapp")}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageCircle size={18} color="var(--color-accent-700)" />
            WhatsApp
          </span>
          <ChevronRight size={14} color="var(--color-neutral-500)" />
        </button>
        <button type="button" className="list-row" onClick={() => go("sms")}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MessageSquareText size={18} color="var(--color-accent-700)" />
            Text message (SMS)
          </span>
          <ChevronRight size={14} color="var(--color-neutral-500)" />
        </button>
        <button type="button" className="list-row" onClick={() => go("call")}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Phone size={18} color="var(--color-accent-700)" />
            Call {provider.phoneDisplay}
          </span>
          <ChevronRight size={14} color="var(--color-neutral-500)" />
        </button>
      </div>
      <button type="button" className="btn btn-ghost btn-block" onClick={close}>
        Cancel
      </button>
    </div>
  );
}
