import Link from "next/link";

/** Site footer: what the site is (and isn't), and the way to reach the people behind it. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="brand">The Local Services</div>
      <p>
        A free directory of local businesses, built on neighbours&rsquo; recommendations. We don&rsquo;t employ, vet or guarantee the businesses
        listed. Check licences, insurance and references yourself before hiring.
      </p>
      <ul className="footer-links">
        <li>
          <Link href="/contact">Contact us</Link>
        </li>
        <li>
          <Link href="/contact?topic=category">Suggest a category</Link>
        </li>
        <li>
          <Link href="/contact?topic=remove">Remove or correct a listing</Link>
        </li>
        <li>
          <Link href="/terms">Terms</Link>
        </li>
        <li>
          <Link href="/privacy">Privacy</Link>
        </li>
      </ul>
      <p>&copy; 2026 The Local Services. Google ratings and reviews are shown with credit to Google Maps and their authors.</p>
    </footer>
  );
}
