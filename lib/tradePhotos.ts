/** Stock photographs for the home page's category cards, keyed like the cover drawings in
 * components/Cover.tsx. The files are in public/trades/. Each came from Unsplash under its free
 * licence; the id beside it is the photo's id there, so it can be found again. A drawing with no
 * photo here keeps its illustration on the card. Listings never use these: a stock photo on a
 * business's own page could be taken for its work. */
const UNSPLASH_IDS: Record<string, string> = {
  toolbox: "photo-1567361808960-dec9cb578182",
  roller: "photo-1562259949-e8e7689d7828",
  car: "photo-1619642751034-765dfdf7c58e",
  scales: "photo-1587740896339-96a76170508d",
  calculator: "photo-1554224155-6726b3ff858f",
  housekey: "photo-1759428679273-11d914866394",
  candle: "photo-1764098979607-16574293ea83",
  diya: "photo-1764098979607-16574293ea83",
  garland: "photo-1789971649660-eefc756ee5dd",
  bulb: "photo-1758101755915-462eddc23f57",
  tap: "photo-1619365566184-272a34acfeb9",
  cake: "photo-1621303837174-89787a7d4729",
  henna: "photo-1730003873829-09b4b16444c1",
  tent: "photo-1780682571078-242672d1dd59",
  saree: "photo-1632194978058-4f2f48bc68c2",
  book: "photo-1533669955142-6a73332af4db",
  sewing: "photo-1466027397211-20d0f2449a3f",
  lplate: "photo-1532004252750-b411a84c8a41",
  toran: "photo-1577083753695-e010191bacb5",
  knee: "photo-1649751361457-01d3a696c7e6",
};

/** The card photo for a cover drawing, if it has one. */
export function tradePhoto(key: string): string | undefined {
  return key in UNSPLASH_IDS ? `/trades/${key}.jpg` : undefined;
}
