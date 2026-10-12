import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Listings and the public pages are open to search engines; the signed-in and admin areas,
 * which show nothing useful to a visitor arriving cold, are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin/", "/auth/", "/api/", "/chat/", "/profile", "/saved", "/onboarding"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
