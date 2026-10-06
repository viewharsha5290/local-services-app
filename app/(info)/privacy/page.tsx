import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — The Local Services",
  description: "What The Local Services collects, why, who can see it, and how to have it corrected or deleted.",
};

export default function PrivacyPage() {
  return (
    <article className="prose">
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated October 6, 2026</p>

      <div className="summary">
        <p>
          <strong>The short version</strong>
        </p>
        <ul>
          <li>You can browse without giving us anything. An account needs only a name and an email address.</li>
          <li>Your email is never shown publicly. Your name appears on your reviews unless you post without it.</li>
          <li>We don&rsquo;t sell personal information, show ads, or use advertising or analytics trackers.</li>
          <li>
            You can ask for a copy of your information, a correction, or deletion through the <Link href="/contact?topic=privacy">contact page</Link>.
          </li>
        </ul>
      </div>

      <h2 id="collect">1. What we collect</h2>
      <p>
        <strong>If you create an account:</strong> your name and email address. We sign you in by emailing a link and a code, so there is no password.
      </p>
      <p>
        <strong>What you add:</strong> reviews, ratings, recommendations, the listings you save, and, if you claim a business, your role there and a
        contact phone number. If you manage a listing, the details and photos you add to it.
      </p>
      <p>
        <strong>When you contact a business:</strong> we count the tap on Call, WhatsApp or SMS for that listing, without recording who you are. If
        you are signed in, we also keep a private note of which business you contacted, only so we can ask you later how it went.
      </p>
      <p>
        <strong>When you write to us:</strong> your name, email address and message.
      </p>
      <p>
        <strong>On your device:</strong> the postal code or city you chose, your theme, and your sign-in session are stored in your browser. If you
        use &ldquo;Use current location&rdquo;, your position stays in your browser and is used there to sort results by distance; we do not store
        it on our servers.
      </p>
      <p>
        <strong>About businesses:</strong> listings contain business information such as name, trade, phone number and service area, taken from
        public sources including Google Maps and from neighbours&rsquo; recommendations.
      </p>

      <h2 id="use">2. What we use it for</h2>
      <ul>
        <li>To run the directory: show listings and reviews, sign you in, and keep your saved list.</li>
        <li>To keep reviews trustworthy: tie each review to a real account, and deal with fake or abusive content.</li>
        <li>To check that someone claiming a listing really represents the business.</li>
        <li>To show a business how many people contacted it through its listing (a count only).</li>
        <li>To reply when you write to us, and to send the sign-in emails you ask for.</li>
      </ul>
      <p>We do not send marketing emails.</p>

      <h2 id="visible">3. Who can see what</h2>
      <ul>
        <li>
          <strong>Everyone:</strong> listings, and your reviews and recommendations with the name on your account. If you tick &ldquo;Post without my
          name&rdquo;, the review shows as &ldquo;A neighbour&rdquo; and other people cannot see who wrote it.
        </li>
        <li>
          <strong>The business that manages a listing:</strong> how many contact taps the listing received. Not who made them.
        </li>
        <li>
          <strong>Our administrators:</strong> account names and emails, who wrote each review (including ones posted without a name), listing claims,
          and messages sent through the contact page.
        </li>
        <li>
          <strong>Nobody else:</strong> your email address, your saved list and your contact history are never shown publicly.
        </li>
      </ul>

      <h2 id="services">4. Companies that help us run the site</h2>
      <p>We use a small number of service providers, who handle information only to provide their service to us:</p>
      <ul>
        <li>Supabase: stores the database, accounts and uploaded photos.</li>
        <li>Vercel: hosts the website.</li>
        <li>Resend: delivers sign-in emails.</li>
        <li>Google: the source of some business details, ratings and reviews. Reviewers&rsquo; profile pictures load directly from Google.</li>
      </ul>
      <p>
        These providers may store or process information outside Canada, including in the United States, where it is subject to the laws of that
        country. We do not sell or rent personal information to anyone.
      </p>

      <h2 id="cookies">5. Cookies and tracking</h2>
      <p>
        We use only the browser storage needed for the site to work: your sign-in, your chosen location and your theme. We do not use advertising
        cookies or third-party analytics.
      </p>

      <h2 id="keep">6. How long we keep it</h2>
      <p>
        We keep account information while your account exists. Reviews stay until you delete them or ask us to. Messages to us are kept as long as
        needed to deal with them and to keep a record of requests. Contact-tap counts carry no personal information and are kept.
      </p>

      <h2 id="rights">7. Your choices and rights</h2>
      <ul>
        <li>Edit or delete your own reviews from the listing page at any time.</li>
        <li>Ask us for a copy of the personal information we hold about you, or to correct it.</li>
        <li>Ask us to delete your account. Your reviews are removed or made anonymous, as you prefer.</li>
        <li>
          If a listing is about you or your business and you want it corrected or removed, tell us through the{" "}
          <Link href="/contact?topic=remove">contact page</Link>.
        </li>
      </ul>
      <p>
        Send requests through the <Link href="/contact?topic=privacy">contact page</Link>. We may need to confirm it is really you. If you are not
        satisfied with our answer, you can complain to the Office of the Privacy Commissioner of Canada.
      </p>

      <h2 id="children">8. Children</h2>
      <p>The site is for adults. Accounts are for people 18 or older, and we do not knowingly collect information from children.</p>

      <h2 id="changes">9. Changes</h2>
      <p>If we change this policy, we will update the date at the top. Significant changes will be noted on the site.</p>

      <h2 id="contact">10. Contact</h2>
      <p>
        The person responsible for privacy at The Local Services can be reached through the <Link href="/contact?topic=privacy">contact page</Link>.
        See also the <Link href="/terms">Terms of Use</Link>.
      </p>
    </article>
  );
}
