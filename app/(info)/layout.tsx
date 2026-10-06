import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { Footer } from "@/components/Footer";

/** Contact, terms and privacy: readable by anyone, with no location or sign-in needed first. */
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="infopage">
      <header className="infopage-head">
        <Link href="/search" className="brand">
          <BrandMark />
          The Local Services
        </Link>
        <Link href="/search" className="back">
          Back to the directory
        </Link>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
}
