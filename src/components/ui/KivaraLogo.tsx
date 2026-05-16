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
      {/* ─── Horizon Symbol — centred, facing ─────────────────── */}
      {/* Upper curve — sky / ocean — arches downward (looks down) */}
      {/* Lower curve — land / earth — arches upward (looks up)      */}
      {/* They face each other, creating negative-space horizon.     */}
      {/* Centered above the wordmark, do NOT reach the edges.       */}
      <path
        d="M 145,20 Q 200,32 255,20"
        stroke={c.upperCurve}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity={variant === "light" ? 0.7 : 1}
      />

      <path
        d="M 135,38 Q 200,28 265,38"
        stroke={c.lowerCurve}
        strokeWidth="0.8"
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
