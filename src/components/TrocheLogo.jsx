// A troche is a lozenge/pill tablet — so the mark is a rounded lozenge with a
// scored center line, the way a real tablet is grooved for splitting.
// Uses currentColor for the body, so set the color via the parent (e.g. white
// on the accent chip). The score line uses --accent.
export default function TrocheLogo({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g transform="rotate(-32 20 20)">
        <rect x="4" y="13" width="32" height="14" rx="7" fill="currentColor" />
        <line
          x1="20" y1="15.5" x2="20" y2="24.5"
          stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round"
          opacity="0.55"
        />
        <rect x="7" y="15" width="26" height="4.5" rx="2.25" fill="#fff" opacity="0.22" />
      </g>
    </svg>
  );
}
