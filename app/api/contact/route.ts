import { createClient } from "@supabase/supabase-js";

/** The contact form posts here. The message is stored through send_contact_message() (which
 * validates it and enforces the sending limits), then the admin is emailed about it.
 *
 * The email is optional: it is sent only when RESEND_API_KEY and CONTACT_NOTIFY_EMAIL are set in
 * the hosting environment. Without them, or if sending fails, the message is still in the admin
 * inbox (/admin/messages) and the sender still sees success. */

const TOPICS: Record<string, string> = {
  category: "Category suggestion",
  listing: "Add or fix a listing",
  remove: "Remove or correct a listing",
  review: "Report a review",
  privacy: "Account or data request",
  problem: "Something isn't working",
  other: "Other",
};

const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Couldn't read that message." }, { status: 400 });
  }
  const name = text(body.name, 200).trim();
  const email = text(body.email, 300).trim();
  const topic = text(body.topic, 40);
  const message = text(body.message, 4000).trim();

  // Called as the visitor: their sign-in token, when they have one, is passed through so the
  // message is linked to their account exactly as a direct call from the browser would be.
  const authorization = request.headers.get("authorization");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
  });
  const { error } = await supabase.rpc("send_contact_message", { p_name: name, p_email: email, p_topic: topic, p_message: message });
  if (error) {
    // 400 = the function turned the message down (its wording is for the sender). Anything else
    // is a fault on our side; 502 tells the page to store the message directly instead.
    const refused = /^(Enter|Choose|Tell us|That message|You have|We are)/.test(error.message);
    return Response.json({ error: error.message }, { status: refused ? 400 : 502 });
  }

  const notified = await notifyAdmin({ name, email: email.toLowerCase(), topic, message });
  return Response.json({ ok: true, notified });
}

async function notifyAdmin(m: { name: string; email: string; topic: string; message: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!key || !to) return false;
  const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "The Local Services <noreply@thelocalservices.ca>",
        to: [to],
        // replying to the alert goes straight to the person who wrote in
        reply_to: m.email,
        subject: oneLine(`[Contact] ${TOPICS[m.topic] ?? "Message"} from ${m.name}`).slice(0, 150),
        text: `${TOPICS[m.topic] ?? m.topic}\nFrom: ${oneLine(m.name)} <${m.email}>\n\n${m.message}\n\n--\nSent through the contact page. Reply to this email to answer them, then mark it as dealt with:\nhttps://www.thelocalservices.ca/admin/messages`,
      }),
    });
    if (!res.ok) console.error("contact alert not sent:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("contact alert not sent:", e);
    return false;
  }
}
