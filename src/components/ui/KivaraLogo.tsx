"use client";

interface KivaraLogoProps {
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}

const COLORS = {
  dark: {
    upperCurve: "#0E1B1A",   // Ocean Black-Blue
    lowerCurve: "#C2A46D",   // Sunset Gold
    wordmark: "#1C1A17",     // Deep Earth Brown
    tagline: "#C2B39C",      // Sand Dark
  },
  light: {
    upperCurve: "#F4F0E8",   // Warm Ivory
    lowerCurve: "#D4BC8A",   // Sunset Gold Light
    wordmark: "#F4F0E8",     // Warm Ivory
    tagline: "#D8CBB8",      // Sand Beige
  },
};

export function KivaraLogo({
  variant = "dark",
  showTagline = false,
  className = "w-full max-w-[300px]",
}: KivaraLogoProps) {
  const c = COLORS[variant];

  return (
    <svg
      viewBox="0 0 400 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} h-auto`}
      aria-label="Kivara"
      role="img"
    >
      {/* ─── Horizon Symbol — facing arcs, same size ──────────── */}
      {/* Both curves share identical width & amplitude. Upper      */}
      {/* arches downward, lower arches upward. They span from      */}
      {/* above the I to above the R in KIVARA.                     */}
      <path
        d="M 118,16 Q 200,34 282,16"
        stroke={c.upperCurve}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity={variant === "light" ? 0.7 : 1}
      />

      <path
        d="M 118,40 Q 200,22 282,40"
        stroke={c.lowerCurve}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity={variant === "light" ? 0.8 : 1}
      />

      {/* ─── Wordmark — KIVARA ──────────────────────────────── */}
      <text
        x="200"
        y="88"
        textAnchor="middle"
        fontFamily="'Trajan Pro','Times New Roman',Georgia,serif"
        fontSize="44"
        fontWeight="400"
        fill={c.wordmark}
        style={{ letterSpacing: "28px" }}
      >
        KIVARA
      </text>

      {/* ─── Tagline — BUSH • BEACH • ROMANCE ───────────────── */}
      {showTagline && (
        <text
          x="200"
          y="120"
          textAnchor="middle"
          fontFamily="'Montserrat','Helvetica Neue',Arial,sans-serif"
          fontSize="7"
          fontWeight="300"
          fill={c.tagline}
          style={{ letterSpacing: "5px" }}
        >
          BUSH ● BEACH ● ROMANCE
        </text>
      )}
    </svg>
  );
}
