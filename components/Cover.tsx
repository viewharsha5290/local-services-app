import { Category, Provider } from "@/lib/types";

/** An illustrated scene per trade, standing in for photos a listing doesn't have. Colours come
 * from the --art-* tokens in globals.css, so each theme (and, in the default theme, each trade)
 * paints the same drawing differently. `seed` varies listings of one trade a little. */
export function Cover({ category, seed = "", className = "" }: { category: Category; seed?: string; className?: string }) {
  const v = hash(seed);
  const classes = ["cover", `cover-${category.toLowerCase()}`, v & 1 ? "flip" : "", v & 2 ? "tint" : "", className].filter(Boolean).join(" ");
  return (
    <span className={classes} aria-hidden="true">
      <svg viewBox="0 0 350 230" preserveAspectRatio="xMidYMid slice">
        <rect className="a-sky" width="350" height="230" />
        {SCENES[category]}
        <rect className="a-tint" width="350" height="230" />
      </svg>
    </span>
  );
}

/** A listing's cover: its first work photo when it has one, otherwise the trade illustration. */
export function ListingCover({ provider, className = "" }: { provider: Pick<Provider, "id" | "category" | "photos">; className?: string }) {
  if (provider.photos.length === 0) return <Cover category={provider.category} seed={provider.id} className={className} />;
  return (
    <span className={`cover ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage; next/image would need a domain allowlist */}
      <img src={provider.photos[0]} alt="" loading="lazy" />
    </span>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const SCENES: Record<Category, React.ReactNode> = {
  // Houses at night under a string of lights.
  Electrician: (
    <>
      <circle className="a-sun" cx="292" cy="46" r="24" />
      <circle className="a-star" cx="60" cy="30" r="2" />
      <circle className="a-star" cx="130" cy="52" r="1.5" />
      <circle className="a-star" cx="200" cy="24" r="2" />
      <path className="a-line" d="M0 60 Q90 100 175 62 T350 66" />
      <circle className="a-light" cx="45" cy="78" r="5" />
      <circle className="a-pop" cx="100" cy="84" r="5" />
      <circle className="a-light" cx="160" cy="68" r="5" />
      <circle className="a-pop" cx="225" cy="60" r="5" />
      <circle className="a-light" cx="300" cy="64" r="5" />
      <rect className="a-ground" y="170" width="350" height="60" />
      <rect className="a-shape" x="24" y="118" width="74" height="70" />
      <path className="a-shape" d="M16 120l45-30 45 30z" />
      <rect className="a-light" x="38" y="134" width="18" height="18" />
      <rect className="a-light" x="66" y="134" width="18" height="18" />
      <rect className="a-pop" x="52" y="162" width="16" height="26" />
      <rect className="a-shape" x="128" y="98" width="88" height="90" />
      <path className="a-shape" d="M120 100l52-36 52 36z" />
      <rect className="a-light" x="142" y="114" width="20" height="20" />
      <rect className="a-shape2" x="182" y="114" width="20" height="20" />
      <rect className="a-shape2" x="142" y="146" width="20" height="20" />
      <rect className="a-light" x="182" y="146" width="20" height="20" />
      <rect className="a-shape" x="246" y="128" width="80" height="60" />
      <path className="a-shape" d="M238 130l48-28 48 28z" />
      <rect className="a-light" x="260" y="142" width="18" height="18" />
      <rect className="a-light" x="294" y="142" width="18" height="18" />
    </>
  ),
  // A car outside a roller-door garage.
  Mechanic: (
    <>
      <circle className="a-sun" cx="62" cy="50" r="26" />
      <rect className="a-ground" y="182" width="350" height="48" />
      <rect className="a-shape" x="140" y="58" width="210" height="124" />
      <rect className="a-shape2" x="156" y="78" width="194" height="14" />
      <rect className="a-shape2" x="156" y="104" width="194" height="14" />
      <rect className="a-shape2" x="156" y="130" width="194" height="14" />
      <path className="a-pop" d="M40 182v-28q0-10 10-10h22l20-28h76l22 28h18q10 0 10 10v28z" />
      <path className="a-light" d="M98 142l15-20h52l16 20z" />
      <circle className="a-shape" cx="86" cy="184" r="19" />
      <circle className="a-light" cx="86" cy="184" r="6" />
      <circle className="a-shape" cx="188" cy="184" r="19" />
      <circle className="a-light" cx="188" cy="184" r="6" />
    </>
  ),
  // A house mid-repair: ladder against the wall, toolbox on the lawn.
  Handyman: (
    <>
      <circle className="a-sun" cx="60" cy="48" r="24" />
      <rect className="a-ground" y="178" width="350" height="52" />
      <rect className="a-shape" x="122" y="96" width="150" height="92" />
      <path className="a-shape" d="M106 98l91-54 91 54z" />
      <rect className="a-light" x="138" y="114" width="26" height="26" />
      <rect className="a-light" x="230" y="114" width="26" height="26" />
      <rect className="a-pop" x="182" y="138" width="30" height="50" />
      <path className="a-rail" d="M64 190L104 78M90 190L130 78" />
      <path className="a-rail" d="M72 166h26M80 142h26M88 118h26M96 96h26" />
      <rect className="a-pop" x="288" y="164" width="46" height="26" rx="3" />
      <path className="a-line" d="M300 164v-8h22v8" />
    </>
  ),
  // A courthouse front: steps, columns, pediment.
  Attorney: (
    <>
      <circle className="a-sun" cx="292" cy="50" r="24" />
      <rect className="a-ground" y="186" width="350" height="44" />
      <rect className="a-shape2" x="62" y="172" width="226" height="16" />
      <rect className="a-shape" x="80" y="92" width="190" height="82" />
      <path className="a-shape" d="M66 94l109-52 109 52z" />
      <circle className="a-pop" cx="175" cy="74" r="8" />
      {[98, 134, 168, 202, 238].map((x) => (
        <rect key={x} className="a-light" x={x} y="104" width="14" height="68" />
      ))}
    </>
  ),
  // Office towers and a rising bar chart.
  Auditor: (
    <>
      <circle className="a-sun" cx="58" cy="46" r="22" />
      <rect className="a-ground" y="186" width="350" height="44" />
      <rect className="a-shape" x="36" y="92" width="72" height="98" />
      <rect className="a-shape2" x="122" y="58" width="86" height="132" />
      <rect className="a-shape" x="222" y="106" width="62" height="84" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`a${r}${c}`} className="a-light" x={46 + c * 20} y={104 + r * 26} width="12" height="14" />))}
      {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => <rect key={`b${r}${c}`} className="a-light" x={134 + c * 24} y={72 + r * 28} width="14" height="16" />))}
      {[0, 1].map((r) => [0, 1].map((c) => <rect key={`c${r}${c}`} className="a-light" x={234 + c * 24} y={120 + r * 28} width="14" height="16" />))}
      <rect className="a-pop" x="298" y="152" width="12" height="38" />
      <rect className="a-pop" x="314" y="134" width="12" height="56" />
      <rect className="a-pop" x="330" y="114" width="12" height="76" />
    </>
  ),
  // A hall with a lit doorway and lamps along the path — not any one faith's building.
  Clergy: (
    <>
      <circle className="a-sun" cx="175" cy="78" r="44" />
      <rect className="a-ground" y="186" width="350" height="44" />
      <rect className="a-shape" x="108" y="98" width="134" height="92" />
      <path className="a-shape" d="M94 100l81-50 81 50z" />
      <path className="a-light" d="M159 190v-46a16 16 0 0 1 32 0v46z" />
      <rect className="a-light" x="122" y="120" width="14" height="28" rx="7" />
      <rect className="a-light" x="214" y="120" width="14" height="28" rx="7" />
      {[36, 68, 282, 314].map((x) => (
        <g key={x}>
          <rect className="a-shape2" x={x - 2} y="180" width="4" height="14" />
          <circle className="a-pop" cx={x} cy="176" r="6" />
        </g>
      ))}
    </>
  ),
};
