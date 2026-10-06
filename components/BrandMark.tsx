/** The house-in-a-square mark that sits beside the site name. */
export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 14 14">
        <path d="M1.5 7L7 1.5 12.5 7v5.5h-11z" fill="currentColor" />
      </svg>
    </span>
  );
}
