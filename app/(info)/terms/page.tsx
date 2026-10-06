import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — The Local Services",
  description: "The rules for using The Local Services, for neighbours and for the businesses listed.",
};

export default function TermsPage() {
  return (
    <article className="prose">
      <h1>Terms of Use</h1>
      <p className="updated">Last updated October 6, 2026</p>

      <div className="summary">
        <p>
          <strong>The short version</strong>
        </p>
        <ul>
          <li>The Local Services is a free directory. We are not the businesses listed, and we are not part of any job you arrange with them.</li>
          <li>We don&rsquo;t check licences, insurance or the quality of anyone&rsquo;s work. That is for you to do before you hire.</li>
          <li>Reviews must be honest and about your own experience.</li>
          <li>
            If a listing is about your business, you can claim it, correct it or ask us to remove it through the <Link href="/contact">contact page</Link>.
          </li>
        </ul>
      </div>

      <h2 id="about">1. What this site is</h2>
      <p>
        The Local Services (&ldquo;we&rdquo;, &ldquo;us&rdquo;) runs thelocalservices.ca, a directory that helps people in Ontario, Canada find local
        businesses and tradespeople, and read what their neighbours say about them. By using the site you agree to these terms. If you don&rsquo;t
        agree, please don&rsquo;t use it.
      </p>
      <p>
        We only provide the directory. When you call or message a business, any agreement, payment, work or dispute that follows is between you and
        that business. We are not a party to it, we take no commission, and we do not supervise the work.
      </p>

      <h2 id="no-vetting">2. We don&rsquo;t vet or guarantee businesses</h2>
      <p>
        A listing is not a recommendation by us. We do not confirm that a business is licensed, insured, bonded, qualified or in good standing, and we
        do not check its work. Before hiring anyone, check their licence or registration where one is required (for example electricians, lawyers, accountants and health practitioners),
        their insurance, and their references.
      </p>
      <p>
        A &ldquo;Claimed&rdquo; label means someone who told us they represent the business has taken over its listing after we contacted the business.
        It says nothing about the quality of their work. Ratings and reviews are other people&rsquo;s opinions, not ours.
      </p>
      <p>
        Nothing on the site is medical, legal, financial, tax, electrical, mechanical or other professional advice. A listing for a health
        practitioner is not a referral, and the site is not for emergencies.
      </p>

      <h2 id="accounts">3. Accounts</h2>
      <ul>
        <li>You can browse without an account. You need one to write a review, recommend a business, save listings or claim a listing.</li>
        <li>You must be 18 or older, use your own email address, and give a name you are known by.</li>
        <li>You are responsible for what is done through your account. Tell us if you think someone else has used it.</li>
      </ul>

      <h2 id="reviews">4. Reviews and recommendations</h2>
      <p>When you write a review or recommend a business, you confirm that:</p>
      <ul>
        <li>it is about your own, real experience as a customer of that business;</li>
        <li>it is honest, and anything you state as fact is true;</li>
        <li>you are not reviewing your own business, your employer, or a competitor, and nobody paid or rewarded you for it;</li>
        <li>
          it contains no threats, harassment, hate, obscenity, or private details about anyone (such as a home address or a personal phone number);
        </li>
        <li>when you add a business, the phone number you give is the one that business gives to its customers.</li>
      </ul>
      <p>
        Reviews are public. They show the name on your account unless you choose &ldquo;Post without my name&rdquo;, in which case the review still
        belongs to your account and we can see who wrote it. You can edit or delete your own reviews at any time.
      </p>
      <p>
        You keep ownership of what you write. You give us permission to display it on the site, and to remove it. You are responsible for what you
        post, including any claim that it is untrue or harms someone.
      </p>
      <p>
        We may remove a review or recommendation, or close an account, if we believe these rules were broken or if we are legally required to. We are
        not obliged to check reviews before they appear, and we do not confirm that they are accurate.
      </p>

      <h2 id="businesses">5. If your business is listed</h2>
      <ul>
        <li>
          Listings come from publicly available business information, including Google Maps, and from recommendations by people who use the site.
          Your business may be listed without you having asked.
        </li>
        <li>
          Listing is free. We do not sell placement, and paying us cannot change your rating or remove a review.
        </li>
        <li>
          You can claim your listing from its page. We confirm claims with the business before approving them. Once approved you can edit your
          description, phone number, service areas and photos.
        </li>
        <li>
          What you add must be accurate and yours to use. Only upload photos you took or have permission to use, and none that show people or private
          addresses without their agreement. You give us permission to display what you add.
        </li>
        <li>
          To have a listing corrected or removed, or to report a review you believe is false, use the{" "}
          <Link href="/contact?topic=remove">contact page</Link>. We look at every request. We remove reviews that break section 4; we do not remove a
          review only because it is negative.
        </li>
      </ul>

      <h2 id="google">6. Content from Google</h2>
      <p>
        Some listings show a rating and a small number of reviews from Google Maps. These are labelled as Google&rsquo;s, are credited to their
        authors, and are kept separate from neighbours&rsquo; reviews. They belong to Google and to the people who wrote them, and they may be out of
        date. Follow the link on the listing to see the current version on Google Maps.
      </p>

      <h2 id="acceptable-use">7. Using the site fairly</h2>
      <p>
        Don&rsquo;t copy the directory in bulk, use it to send unsolicited marketing, try to get into other people&rsquo;s accounts, interfere with
        how the site works, or post anything unlawful.
      </p>

      <h2 id="liability">8. No warranty, and limits on our responsibility</h2>
      <p>
        The site is provided as it is. Listings, phone numbers, ratings and reviews may be wrong, incomplete or out of date, and the site may be
        unavailable at times.
      </p>
      <p>
        To the fullest extent the law allows, we are not responsible for any loss or damage arising from your dealings with a business you found
        here, from relying on anything on the site, or from the site being unavailable. Where we cannot exclude responsibility, it is limited to one
        hundred Canadian dollars (CAD $100). Nothing in these terms takes away rights you have under consumer protection law that cannot be waived.
      </p>
      <p>
        If someone brings a claim against us because of something you posted or because you broke these terms, you agree to cover our reasonable
        costs.
      </p>

      <h2 id="changes">9. Changes, and the law that applies</h2>
      <p>
        We may update these terms. The date at the top shows the latest version, and continuing to use the site means you accept it. These terms are
        governed by the laws of Ontario and the federal laws of Canada that apply there, and the courts of Ontario have jurisdiction.
      </p>

      <h2 id="contact">10. Contact</h2>
      <p>
        Questions, corrections, removal requests and complaints all go through the <Link href="/contact">contact page</Link>. How we handle personal
        information is described in the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </article>
  );
}
