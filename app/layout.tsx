import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { SheetProvider } from "@/components/SheetProvider";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Local — find who your neighbors trust",
  description: "A local services directory for handymen, mechanics, attorneys and more, built on neighbor recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <AppProvider>
          <SheetProvider>
            <div className="app-viewport">
              <div className="app-frame">{children}</div>
            </div>
          </SheetProvider>
        </AppProvider>
      </body>
    </html>
  );
}
