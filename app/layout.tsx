import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Fraunces, Manrope, Plus_Jakarta_Sans, Work_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { SheetProvider } from "@/components/SheetProvider";
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from "@/lib/themes";

// One font set per theme (see globals.css). Only the default theme's font is preloaded; the
// browser fetches the others when a visitor switches to a theme that uses them.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], preload: false });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], preload: false });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], preload: false });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], preload: false });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], preload: false });

const fontVariables = [jakarta, fraunces, workSans, dmSans, bricolage, manrope].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "The Local Services — find who your neighbours trust",
  description: "A local services directory for handymen, mechanics, attorneys and more, built on neighbour recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme may be rewritten by THEME_INIT_SCRIPT before React hydrates, hence the suppression.
    <html lang="en" className={fontVariables} data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
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
