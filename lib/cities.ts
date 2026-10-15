// Static list of major Canadian cities/towns for the city-wide search autocomplete.
// Free, instant, client-side — no places/geocoding API. Not exhaustive; covers every
// province/territory's larger centres plus the full Greater Toronto Area (where the
// seed provider data lives).
export const CANADIAN_CITIES: string[] = [
  // Ontario / GTA (dense, since this is where the app launches)
  "Toronto, ON",
  "Mississauga, ON",
  "Brampton, ON",
  "Markham, ON",
  "Vaughan, ON",
  "Richmond Hill, ON",
  "Oakville, ON",
  "Burlington, ON",
  "Hamilton, ON",
  "Oshawa, ON",
  "Whitby, ON",
  "Ajax, ON",
  "Pickering, ON",
  "Thornhill, ON",
  "Newmarket, ON",
  "Aurora, ON",
  "Milton, ON",
  "Barrie, ON",
  "Guelph, ON",
  "Kitchener, ON",
  "Waterloo, ON",
  "Cambridge, ON",
  "London, ON",
  "Windsor, ON",
  "Ottawa, ON",
  "Kingston, ON",
  "Sudbury, ON",
  "Thunder Bay, ON",
  "Niagara Falls, ON",
  "St. Catharines, ON",
  "Peterborough, ON",
  // Quebec
  "Montreal, QC",
  "Quebec City, QC",
  "Laval, QC",
  "Gatineau, QC",
  "Longueuil, QC",
  "Sherbrooke, QC",
  "Trois-Rivieres, QC",
  // British Columbia
  "Vancouver, BC",
  "Surrey, BC",
  "Burnaby, BC",
  "Richmond, BC",
  "Victoria, BC",
  "Kelowna, BC",
  "Abbotsford, BC",
  "Coquitlam, BC",
  "Nanaimo, BC",
  "Kamloops, BC",
  // Alberta
  "Calgary, AB",
  "Edmonton, AB",
  "Red Deer, AB",
  "Lethbridge, AB",
  "St. Albert, AB",
  // Manitoba
  "Winnipeg, MB",
  "Brandon, MB",
  // Saskatchewan
  "Saskatoon, SK",
  "Regina, SK",
  // Atlantic
  "Halifax, NS",
  "Moncton, NB",
  "Saint John, NB",
  "Fredericton, NB",
  "Charlottetown, PE",
  "St. John's, NL",
  // Territories
  "Whitehorse, YT",
  "Yellowknife, NT",
  "Iqaluit, NU",
];

/** Put in a listing’s cities for a business that serves everyone, wherever they are (online
 * classes, say): it then shows to people browsing any city. Written like a city so the database’s
 * city check accepts it; deliberately not in CANADIAN_CITIES, so nobody can browse “All of Canada”. */
export const NATIONWIDE = "All of Canada, CA";

const PROVINCES: Record<string, string> = {
  ON: "Ontario",
  QC: "Quebec",
  BC: "British Columbia",
  AB: "Alberta",
  MB: "Manitoba",
  SK: "Saskatchewan",
  NS: "Nova Scotia",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  PE: "Prince Edward Island",
  YT: "Yukon",
  NT: "Northwest Territories",
  NU: "Nunavut",
};

/** The marker for a business that serves a whole province, e.g. "All of Ontario, ON". Like
 * NATIONWIDE, it is written like a city and is never offered as a place to browse. */
export function provinceWide(code: string) {
  return `All of ${PROVINCES[code]}, ${code}`;
}

/** True for "All of Canada" and the whole-province markers, as opposed to a real city. */
export function isRegion(area: string) {
  return area.startsWith("All of ");
}

/** How a listing’s area reads to people: "Hamilton, ON", "All of Ontario", "All of Canada". */
export function areaLabel(area: string) {
  return isRegion(area) ? area.split(",")[0] : area;
}

/** "across Canada", "across Ontario and Quebec": the regions in a listing’s areas, or null. */
export function regionPhrase(areas: string[]) {
  const regions = areas.filter(isRegion).map((a) => areaLabel(a).slice("All of ".length));
  if (regions.includes("Canada")) return "across Canada";
  return regions.length ? `across ${regions.join(" and ")}` : null;
}

/** Everything a listing could carry to show up for someone browsing this city. */
export function areasCovering(city: string) {
  const code = city.split(", ")[1];
  return [city, ...(code && PROVINCES[code] ? [provinceWide(code)] : []), NATIONWIDE];
}

/** Suggestions for a listing’s areas: whole provinces and all of Canada first, then cities. */
export function searchAreas(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const regions = Object.entries(PROVINCES)
    .filter(([code, name]) => code.toLowerCase() === q || name.toLowerCase().startsWith(q) || (q.length >= 3 && name.toLowerCase().includes(q)))
    .map(([code]) => provinceWide(code));
  if (/^(all|can|onl|any|cou|nat)/.test(q)) regions.unshift(NATIONWIDE);
  return [...regions, ...searchCities(query, limit)].slice(0, limit);
}

export function searchCities(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = CANADIAN_CITIES.filter((c) => c.toLowerCase().startsWith(q));
  const contains = CANADIAN_CITIES.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}
