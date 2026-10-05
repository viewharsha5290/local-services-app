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

export function searchCities(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = CANADIAN_CITIES.filter((c) => c.toLowerCase().startsWith(q));
  const contains = CANADIAN_CITIES.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}
