"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { ContactTopic } from "@/lib/types";

const TOPICS: { value: ContactTopic; label: string; prompt: string }[] = [
  { value: "category", label: "Suggest a new category", prompt: "Which trade or service should we add? If you know a business that belongs in it, tell us about them too." },
  { value: "listing", label: "Add a business or fix its details", prompt: "The business name, what they do, their phone number and the areas they cover." },
  { value: "remove", label: "Remove or correct a listing", prompt: "Which listing, and what's wrong with it? If it's your business, say so and tell us what you'd like done." },
  { value: "review", label: "Report a review", prompt: "Which listing is it on, who wrote it, and what's the problem with it?" },
  { value: "privacy", label: "My account or my data", prompt: "Tell us what you need: a copy of your data, a correction, or your account deleted." },
  { value: "problem", label: "Something isn't working", prompt: "What were you trying to do, and what happened instead?" },
  { value: "other", label: "Something else", prompt: "How can we help?" },
];

function ContactForm() {
  const params = useSearchParams();
  const { auth, sendContactMessage } = useApp();
  const asked = params.get("topic");
  const listing = params.get("listing");
  const [topic, setTopic] = useState<ContactTopic | "">(TOPICS.some((t) => t.value === asked) ? (asked as ContactTopic) : "");
  // typed values win; until then, fill in what we know about a signed-in visitor
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const [message, setMessage] = useState(listing ? `About the listing "${listing}":\n\n` : "");
  const [website, setWebsite] = useState(""); // honeypot: people never see it, form-filling bots do
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const name = nameInput ?? auth.name ?? "";
  const email = emailInput ?? auth.email ?? "";
  const current = TOPICS.find((t) => t.value === topic);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (website) return setSent(true);
    if (!topic) return setError("Choose what your message is about.");
    if (name.trim().length < 2) return setError("Enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address so we can reply.");
    if (message.trim().length < 10) return setError("Tell us a little more so we can help.");
    setSending(true);
    setError(null);
    const result = await sendContactMessage({ name, email, topic, message });
    setSending(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="prose">
        <h1>Message sent</h1>
        <p>Thanks. We read every message and reply by email, usually within a few days.</p>
        <Link href="/search" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Back to the directory
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="prose">
        <h1>Contact us</h1>
        <p>Suggest a category, ask us to add, fix or remove a listing, report a review, or tell us about anything else. We reply by email.</p>
      </div>
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 20 }}>
        <div className="field">
          <label htmlFor="contact-topic">What is it about?</label>
          <select id="contact-topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value as ContactTopic)}>
            <option value="" disabled>
              Choose a topic
            </option>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="contact-name">Your name</label>
          <input id="contact-name" className="input" autoComplete="name" maxLength={80} value={name} onChange={(e) => setNameInput(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="contact-email">Your email</label>
          <input id="contact-email" className="input" type="email" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmailInput(e.target.value)} />
          <span className="hint">Only used to reply to you.</span>
        </div>
        <div className="field">
          <label htmlFor="contact-message">Your message</label>
          <textarea id="contact-message" className="input" rows={6} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
          <span className="hint">{current?.prompt ?? "How can we help?"}</span>
        </div>
        <div aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="contact-website">Leave this empty</label>
          <input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        {error && <p role="alert" style={{ color: "var(--color-danger)", fontSize: 14, margin: 0 }}>{error}</p>}
        <div>
          <button type="submit" className="btn btn-primary" disabled={sending}>
            {sending ? "Sending…" : "Send message"}
          </button>
        </div>
        <p className="legal" style={{ margin: 0 }}>
          We keep your message and email so we can reply and act on it. See the <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </form>
    </>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={null}>
      <ContactForm />
    </Suspense>
  );
}
