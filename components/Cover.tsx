"use client";

import { Category, Provider } from "@/lib/types";
import { useApp } from "@/lib/store";
import { findCategory } from "@/lib/categories";
import { coverStyle } from "@/lib/photos";

/** The names categories used for their cover art before each trade had its own drawing. */
const OLD_KEYS: Record<string, string> = {
  lights: "bulb",
  garage: "car",
  house: "toolbox",
  columns: "scales",
  towers: "calculator",
  hall: "diya",
  shop: "saree",
  van: "tent",
  garden: "garland",
};

/** The drawing a categories.art value stands for; anything unknown gets the saree. */
export function artKey(art: string) {
  const key = OLD_KEYS[art] ?? art;
  return key in OBJECTS ? key : "saree";
}

/** An illustration standing in for photos a listing doesn't have: one object for the trade, cut
 * out like a sticker, with a little confetti. Each trade picks its object (categories.art); pass
 * `art` to draw a specific one. Colours come from the --art-* tokens in globals.css, so each theme
 * (and, in the default theme, each object) paints the same drawing differently. `seed` varies
 * listings of one trade a little. `layout="side"` keeps the object to the right of a wide card,
 * leaving the left for words. */
export function Cover({
  category,
  art,
  seed = "",
  className = "",
  layout = "center",
}: {
  category?: Category;
  art?: string;
  seed?: string;
  className?: string;
  layout?: "center" | "side";
}) {
  const { categories } = useApp();
  const key = artKey(art ?? (category ? findCategory(categories, category).art : "saree"));
  const v = hash(seed);
  const side = layout === "side";
  const object = OBJECTS[key];
  return (
    <span className={["cover", `cover-${key}`, className].filter(Boolean).join(" ")} aria-hidden="true">
      <svg viewBox={side ? "0 0 520 230" : "0 0 350 230"} preserveAspectRatio={side ? "xMaxYMid slice" : "xMidYMid slice"}>
        <rect className="a-sky" width="520" height="230" />
        <g transform={side ? "translate(352 32) scale(1.15)" : "translate(98 38) scale(1.1)"}>
          {CONFETTI[v % CONFETTI.length]}
          <g transform={`rotate(${v & 1 ? 6 : -8} 70 70)`}>
            {/* the same shapes again, fattened and painted one colour, make the sticker's edge */}
            <g className="a-edge">{object}</g>
            {object}
          </g>
        </g>
      </svg>
    </span>
  );
}

/** A listing's cover: its first work photo when it has one, otherwise the trade illustration. */
export function ListingCover({ provider, className = "" }: { provider: Pick<Provider, "id" | "category" | "photos" | "coverCrop">; className?: string }) {
  if (provider.photos.length === 0) return <Cover category={provider.category} seed={provider.id} className={className} />;
  return (
    <span className={`cover ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage; next/image would need a domain allowlist */}
      <img src={provider.photos[0]} alt="" loading="lazy" style={coverStyle(provider.coverCrop)} />
    </span>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Scattered around the object, in the same 140-unit box it is drawn in. */
const CONFETTI: React.ReactNode[] = [
  <>
    <rect className="a-sun" x="-22" y="112" width="15" height="15" rx="3" transform="rotate(20 -14 120)" />
    <circle className="a-pop" cx="152" cy="16" r="8" />
    <path className="a-shape" d="M-10 22l11 5-8 9z" />
    <path className="a-sun" d="M144 98l14 4-10 11z" />
  </>,
  <>
    <circle className="a-sun" cx="-14" cy="28" r="9" />
    <rect className="a-pop" x="146" y="100" width="14" height="14" rx="3" transform="rotate(-18 153 107)" />
    <path className="a-shape" d="M150 24l12 2-7 11z" />
    <path className="a-pop" d="M-18 104l13-3-4 13z" />
  </>,
  <>
    <path className="a-pop" d="M-16 18l14 3-9 11z" />
    <circle className="a-shape" cx="156" cy="62" r="6" />
    <rect className="a-sun" x="140" y="118" width="13" height="13" rx="3" transform="rotate(30 146 124)" />
    <circle className="a-sun" cx="-12" cy="96" r="7" />
  </>,
];

const car = (
  <>
    <path className="a-pop" d="M12 112V94q0-9 9-9h10l15-24h48l17 24h10q9 0 9 9v18z" />
    <path className="a-light" d="M40 84l10-17h36l12 17z" />
    <rect className="a-pop" x="66" y="67" width="4" height="17" />
    <circle className="a-shape" cx="40" cy="114" r="14" />
    <circle className="a-light" cx="40" cy="114" r="5" />
    <circle className="a-shape" cx="102" cy="114" r="14" />
    <circle className="a-light" cx="102" cy="114" r="5" />
  </>
);

/** Keyed by categories.art; the choices offered to an admin are ART_OPTIONS in lib/categories.ts.
 * Each is drawn inside a 140 by 140 box. */
const OBJECTS: Record<string, React.ReactNode> = {
  // Attorney: scales of justice.
  scales: (
    <>
      <rect className="a-shape" x="46" y="118" width="48" height="9" rx="4.5" />
      <rect className="a-shape" x="67" y="30" width="6" height="92" />
      <rect className="a-shape" x="18" y="36" width="104" height="6" rx="3" />
      <path className="a-stroke" strokeWidth="3" d="M28 42L13 82M28 42L43 82M112 42L97 82M112 42L127 82" />
      <path className="a-pop" d="M7 82h42a21 21 0 0 1-42 0z" />
      <path className="a-pop" d="M91 82h42a21 21 0 0 1-42 0z" />
      <circle className="a-sun" cx="70" cy="33" r="9" />
    </>
  ),
  // Mechanic: a car with a wrench over it.
  car: (
    <>
      <g transform="rotate(38 98 34)">
        <rect className="a-shape" x="93" y="30" width="10" height="44" rx="5" />
        <circle className="a-shape" cx="98" cy="24" r="14" />
        <rect className="a-cut" x="93" y="6" width="10" height="18" />
      </g>
      {car}
    </>
  ),
  // Driving schools: a learner's car.
  lplate: (
    <>
      <rect className="a-sun" x="52" y="14" width="36" height="38" rx="6" />
      <path className="a-shape" d="M62 22h8v18h10v7H62z" />
      <rect className="a-shape" x="67" y="50" width="6" height="12" />
      {car}
    </>
  ),
  // Auditor: a calculator in front of a ledger.
  calculator: (
    <>
      <g transform="rotate(10 90 60)">
        <rect className="a-shape2" x="56" y="14" width="68" height="90" rx="7" />
        <rect className="a-light" x="68" y="30" width="44" height="5" rx="2.5" />
        <rect className="a-light" x="68" y="44" width="44" height="5" rx="2.5" />
        <rect className="a-light" x="68" y="58" width="30" height="5" rx="2.5" />
      </g>
      <rect className="a-shape" x="14" y="34" width="74" height="98" rx="11" />
      <rect className="a-light" x="24" y="44" width="54" height="20" rx="5" />
      {[74, 92, 110].map((y) =>
        [24, 44, 64].map((x) => <rect key={`${x}-${y}`} className={x === 64 ? "a-sun" : "a-pop"} x={x} y={y} width="14" height="12" rx="3" />)
      )}
    </>
  ),
  // Mortgages: a house and its key.
  housekey: (
    <>
      <path className="a-pop" d="M8 66L60 20l52 46z" />
      <rect className="a-shape2" x="22" y="62" width="76" height="60" rx="5" />
      <rect className="a-shape" x="48" y="84" width="22" height="38" rx="4" />
      <rect className="a-light" x="30" y="72" width="14" height="14" rx="2" />
      <circle className="a-sun" cx="90" cy="104" r="16" />
      <circle className="a-cut" cx="90" cy="104" r="6" />
      <rect className="a-sun" x="102" y="99" width="34" height="10" rx="3" />
      <rect className="a-sun" x="118" y="107" width="7" height="10" />
      <rect className="a-sun" x="128" y="107" width="7" height="8" />
    </>
  ),
  // Handyman: a toolbox.
  toolbox: (
    <>
      <rect className="a-sun" x="96" y="10" width="10" height="34" rx="5" />
      <rect className="a-shape" x="99" y="40" width="4" height="22" />
      <rect className="a-shape" x="46" y="28" width="48" height="36" rx="10" />
      <rect className="a-cut" x="56" y="38" width="28" height="28" rx="4" />
      <rect className="a-pop" x="12" y="56" width="116" height="70" rx="10" />
      <rect className="a-shape2" x="12" y="78" width="116" height="9" />
      <rect className="a-sun" x="58" y="70" width="24" height="24" rx="5" />
    </>
  ),
  // Renovations: a paint roller.
  roller: (
    <>
      <path className="a-stroke" strokeWidth="7" d="M110 37h16v34H70v16" />
      <rect className="a-pop" x="14" y="18" width="98" height="38" rx="13" />
      <rect className="a-light" x="26" y="26" width="52" height="7" rx="3.5" />
      <path className="a-pop" d="M30 52v14a7 7 0 0 0 14 0V52z" />
      <rect className="a-shape" x="61" y="84" width="18" height="46" rx="9" />
      <rect className="a-sun" x="61" y="96" width="18" height="6" />
    </>
  ),
  // Electrician: a light bulb.
  bulb: (
    <>
      <path className="a-stroke a-ray" strokeWidth="5" d="M20 16l9 9M120 16l-9 9M6 60h12M122 60h12" />
      <circle className="a-sun" cx="70" cy="54" r="38" />
      <rect className="a-sun" x="52" y="80" width="36" height="18" />
      <path className="a-stroke" strokeWidth="4" d="M56 62l9-13 5 13 5-13 9 13" />
      <rect className="a-shape" x="50" y="96" width="40" height="10" rx="4" />
      <rect className="a-shape" x="54" y="108" width="32" height="9" rx="4" />
      <rect className="a-shape2" x="61" y="119" width="18" height="9" rx="4.5" />
    </>
  ),
  // Plumber: a dripping tap.
  tap: (
    <>
      <rect className="a-shape" x="6" y="34" width="12" height="40" rx="4" />
      <rect className="a-shape2" x="14" y="44" width="72" height="20" rx="4" />
      <path className="a-shape2" d="M82 44h14q20 0 20 20v18H96V70q0-6-6-6h-8z" />
      <rect className="a-shape" x="45" y="28" width="10" height="18" />
      <rect className="a-sun" x="26" y="16" width="48" height="14" rx="7" />
      <path className="a-pop" d="M106 92q-11 15-11 22a11 11 0 0 0 22 0q0-7-11-22z" />
    </>
  ),
  // A diya, for a category that is specifically about Hindu ceremonies.
  diya: (
    <>
      <path className="a-sun" d="M70 12q-23 31-23 46a23 23 0 0 0 46 0q0-15-23-46z" />
      <path className="a-light" d="M70 42q-10 14-10 20a10 10 0 0 0 20 0q0-6-10-20z" />
      <path className="a-pop" d="M12 84h116q0 40-58 40T12 84z" />
      <rect className="a-shape2" x="8" y="78" width="124" height="11" rx="5.5" />
      <circle className="a-sun" cx="44" cy="102" r="4.5" />
      <circle className="a-sun" cx="70" cy="106" r="4.5" />
      <circle className="a-sun" cx="96" cy="102" r="4.5" />
      <rect className="a-shape" x="50" y="122" width="40" height="9" rx="4.5" />
    </>
  ),
  // Priests and places of worship of any faith: a lit candle.
  candle: (
    <>
      <path className="a-sun" d="M70 6q-17 24-17 36a17 17 0 0 0 34 0q0-12-17-36z" />
      <path className="a-light" d="M70 30q-7 10-7 15a7 7 0 0 0 14 0q0-5-7-15z" />
      <rect className="a-shape" x="67" y="54" width="6" height="14" rx="3" />
      <rect className="a-pop" x="46" y="62" width="48" height="58" rx="8" />
      <path className="a-light" d="M46 76q8 8 14 0t14 2q6 8 10 0t10-2v-6a8 8 0 0 0-8-8H54a8 8 0 0 0-8 8z" />
      <rect className="a-shape2" x="22" y="114" width="96" height="11" rx="5.5" />
      <rect className="a-shape" x="50" y="124" width="40" height="9" rx="4.5" />
    </>
  ),
  // Tiffin and catering: a stacked steel tiffin carrier.
  tiffin: (
    <>
      <ellipse className="a-ground" cx="70" cy="128" rx="54" ry="6" />
      <path className="a-stroke" strokeWidth="8" d="M52 34V22q0-12 18-12t18 12v12" />
      <rect className="a-shape" x="18" y="34" width="7" height="90" rx="3.5" />
      <rect className="a-shape" x="115" y="34" width="7" height="90" rx="3.5" />
      <rect className="a-shape2" x="34" y="30" width="72" height="12" rx="6" />
      {[40, 68, 96].map((y, i) => (
        <g key={y}>
          <rect className={i === 1 ? "a-sun" : "a-pop"} x="26" y={y} width="88" height="26" rx="9" />
          <rect className="a-light" x="34" y={y + 6} width="10" height="14" rx="5" />
          <rect className="a-shape2" x="26" y={y + 22} width="88" height="4" rx="2" />
        </g>
      ))}
      <rect className="a-shape" x="16" y="56" width="108" height="6" rx="3" />
    </>
  ),
  // Cleaning services: a spray bottle mid-spritz.
  spray: (
    <>
      <ellipse className="a-ground" cx="66" cy="130" rx="40" ry="6" />
      <rect className="a-pop" x="38" y="60" width="54" height="68" rx="12" />
      <rect className="a-light" x="47" y="78" width="36" height="30" rx="5" />
      <rect className="a-shape2" x="52" y="46" width="26" height="16" rx="3" />
      <rect className="a-shape" x="42" y="24" width="48" height="24" rx="7" />
      <rect className="a-shape" x="86" y="28" width="20" height="10" rx="3" />
      <path className="a-shape2" d="M58 48q-9 6-11 19l9 2q2-11 9-15z" />
      <circle className="a-sun" cx="118" cy="24" r="5" />
      <circle className="a-sun" cx="128" cy="36" r="3.5" />
      <circle className="a-sun" cx="120" cy="46" r="4" />
      <circle className="a-sun" cx="132" cy="18" r="3" />
    </>
  ),
  // Flowers and pooja items: a marigold garland.
  garland: (
    <>
      {[
        [16, 28],
        [26, 56],
        [45, 80],
        [70, 90],
        [95, 80],
        [114, 56],
        [124, 28],
      ].map(([x, y], i) => (
        <g key={x}>
          <circle className={i % 2 ? "a-sun" : "a-pop"} cx={x} cy={y} r="14" />
          <circle className="a-shape" cx={x} cy={y} r="4.5" />
        </g>
      ))}
      <rect className="a-shape2" x="68" y="102" width="4" height="10" />
      <circle className="a-sun" cx="70" cy="120" r="11" />
      <circle className="a-shape" cx="70" cy="120" r="3.5" />
    </>
  ),
  // Cakes: a two-tier cake.
  cake: (
    <>
      <ellipse className="a-ground" cx="70" cy="124" rx="58" ry="7" />
      <rect className="a-pop" x="22" y="86" width="96" height="36" rx="7" />
      <rect className="a-light" x="22" y="82" width="96" height="12" rx="6" />
      {[36, 58, 82, 104].map((x, i) => (
        <circle key={x} className="a-light" cx={x} cy={i % 2 ? 97 : 95} r={i % 2 ? 6 : 5} />
      ))}
      <rect className="a-shape2" x="40" y="54" width="60" height="30" rx="7" />
      <rect className="a-light" x="40" y="50" width="60" height="11" rx="5.5" />
      <rect className="a-shape" x="56" y="30" width="5" height="21" rx="2" />
      <rect className="a-shape" x="79" y="30" width="5" height="21" rx="2" />
      <ellipse className="a-sun" cx="58.5" cy="24" rx="4" ry="6" />
      <ellipse className="a-sun" cx="81.5" cy="24" rx="4" ry="6" />
      {[52, 70, 88].map((x) => (
        <circle key={x} className="a-sun" cx={x} cy="72" r="3" />
      ))}
    </>
  ),
  // Beauty: a hand with henna.
  henna: (
    <>
      <rect className="a-sun" x="20" y="62" width="14" height="38" rx="7" transform="rotate(-32 27 81)" />
      <rect className="a-sun" x="40" y="26" width="12" height="48" rx="6" />
      <rect className="a-sun" x="55" y="14" width="12" height="56" rx="6" />
      <rect className="a-sun" x="70" y="16" width="12" height="54" rx="6" />
      <rect className="a-sun" x="85" y="28" width="12" height="46" rx="6" />
      <rect className="a-sun" x="38" y="58" width="60" height="68" rx="20" />
      <rect className="a-pop" x="40" y="40" width="12" height="4" />
      <rect className="a-pop" x="55" y="30" width="12" height="4" />
      <rect className="a-pop" x="70" y="32" width="12" height="4" />
      <rect className="a-pop" x="85" y="42" width="12" height="4" />
      <circle className="a-pop" cx="68" cy="94" r="12" />
      <circle className="a-sun" cx="68" cy="94" r="6.5" />
      <circle className="a-pop" cx="68" cy="94" r="2.5" />
      {[
        [68, 75],
        [87, 94],
        [68, 113],
        [49, 94],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} className="a-shape2" cx={x} cy={y} r="3" />
      ))}
    </>
  ),
  // Tailoring: a sewing machine.
  sewing: (
    <>
      <rect className="a-sun" x="60" y="16" width="18" height="18" rx="3" />
      <rect className="a-shape2" x="65" y="9" width="8" height="8" />
      <path className="a-pop" d="M24 110V48q0-16 16-16h66q16 0 16 16v22H98V58H56v52z" />
      <circle className="a-sun" cx="24" cy="58" r="13" />
      <circle className="a-shape" cx="24" cy="58" r="4.5" />
      <circle className="a-shape2" cx="76" cy="45" r="5" />
      <rect className="a-shape2" x="108" y="70" width="4" height="26" />
      <rect className="a-shape" x="100" y="94" width="20" height="5" rx="2" />
      <rect className="a-shape" x="8" y="108" width="124" height="16" rx="6" />
    </>
  ),
  // Clothing: a saree draped on a dress form.
  saree: (
    <>
      <rect className="a-shape" x="67" y="116" width="6" height="12" />
      <rect className="a-shape" x="48" y="126" width="44" height="7" rx="3.5" />
      <rect className="a-shape" x="62" y="8" width="16" height="12" rx="5" />
      <path className="a-sun" d="M44 24q26 12 52 0l5 22q-9 10-7 24H46q2-14-7-24z" />
      <path className="a-pop" d="M47 68h46l21 50q-44 12-88 0z" />
      <path className="a-shape2" d="M30 108q40 11 80 0l4 10q-44 12-88 0z" />
      <path className="a-stroke a-ray" strokeWidth="3" d="M70 76v30M58 76l-6 28M82 76l6 28" />
      <path className="a-shape2" d="M92 70L56 20l-14 6 34 46z" />
      <path className="a-shape2" d="M42 26l14-6-2 62q-10 6-20 0z" />
      <path className="a-sun" d="M34 74q10 5 20 0v8q-10 6-20 0z" />
    </>
  ),
  // Classes: an open book and an anklet bell.
  book: (
    <>
      <path className="a-pop" d="M10 46q30-12 58 4v76q-28-14-58-4z" />
      <path className="a-shape2" d="M130 46q-30-12-58 4v76q28-14 58-4z" />
      <path className="a-stroke a-page" strokeWidth="4" d="M22 62q18-5 34 2M22 80q18-5 34 2M22 98q18-5 34 2M84 64q16-7 34-2M84 82q16-7 34-2M84 100q16-7 34-2" />
      <path className="a-stroke" strokeWidth="4" d="M104 12a8 8 0 1 0-8 8" />
      <circle className="a-sun" cx="100" cy="28" r="15" />
      <rect className="a-shape" x="89" y="27" width="22" height="4" rx="2" />
    </>
  ),
  // Party rentals: a canopy tent.
  tent: (
    <>
      <rect className="a-shape" x="68.5" y="4" width="3" height="16" />
      <path className="a-sun" d="M71 4l15 5-15 6z" />
      <rect className="a-shape" x="14" y="68" width="6" height="60" />
      <rect className="a-shape" x="120" y="68" width="6" height="60" />
      <rect className="a-shape2" x="67" y="68" width="6" height="60" />
      <path className="a-pop" d="M6 60L70 18l64 42z" />
      <path className="a-sun" d="M6 60h128v8q-8 9-16 0t-16 0t-16 0t-16 0t-16 0t-16 0t-16 0t-16 0z" />
      <rect className="a-shape2" x="30" y="104" width="30" height="5" rx="2" />
      <rect className="a-shape2" x="80" y="104" width="30" height="5" rx="2" />
      <rect className="a-shape" x="34" y="109" width="4" height="19" />
      <rect className="a-shape" x="52" y="109" width="4" height="19" />
      <rect className="a-shape" x="84" y="109" width="4" height="19" />
      <rect className="a-shape" x="102" y="109" width="4" height="19" />
    </>
  ),
  // Gifts and decor: a door toran.
  toran: (
    <>
      <rect className="a-shape" x="8" y="22" width="124" height="11" rx="5.5" />
      {[14, 37, 59, 81, 104].map((x, i) => (
        <g key={x}>
          <path className={i % 2 ? "a-sun" : "a-pop"} d={`M${x} 33h22v${i === 2 ? 40 : 26}l-11 16l-11-16z`} />
          <circle className="a-shape2" cx={x + 11} cy={i === 2 ? 98 : 84} r="4.5" />
        </g>
      ))}
      <rect className="a-shape2" x="68" y="102" width="4" height="12" />
      <circle className="a-pop" cx="70" cy="122" r="9" />
      <circle className="a-sun" cx="12" cy="27" r="11" />
      <circle className="a-sun" cx="128" cy="27" r="11" />
      <circle className="a-shape" cx="12" cy="27" r="4" />
      <circle className="a-shape" cx="128" cy="27" r="4" />
    </>
  ),
  // Orthopedic: a bent leg with a sore knee.
  knee: (
    <>
      <rect className="a-sun" x="18" y="20" width="78" height="28" rx="14" transform="rotate(30 32 34)" />
      <rect className="a-sun" x="61" y="45" width="28" height="78" rx="14" transform="rotate(12 75 59)" />
      <rect className="a-sun" x="54" y="100" width="48" height="22" rx="11" />
      <circle className="a-pop" cx="77" cy="58" r="13" />
      <circle className="a-light" cx="77" cy="58" r="5" />
      <path className="a-pop" d="M100 44q9 13 0 27l-6-4q5-9 0-19z" />
      <path className="a-pop" d="M113 36q14 21 0 43l-6-4q10-17 0-35z" />
      <circle className="a-shape2" cx="30" cy="92" r="14" />
      <rect className="a-light" x="22.5" y="89.5" width="15" height="5" rx="2" />
      <rect className="a-light" x="27.5" y="84.5" width="5" height="15" rx="2" />
    </>
  ),
};
