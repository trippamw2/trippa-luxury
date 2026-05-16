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
      {/* ─── Horizon Symbol (intersecting) ─────────────────────── */}
      {/* Upper curve — sky / ocean — Ocean Black-Blue */}
      {/* Sweeps down through the lower curve, creating an interlaced crossing */}
      <path
        d="M 70,26 C 140,44 240,18 330,28"
        stroke={c.upperCurve}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        opacity={variant === "light" ? 0.7 : 1}
      />

      {/* Lower curve — land / beach / earth — Sunset Gold */}
      {/* Sweeps up through the upper curve, crossing twice for a braided horizon */}
      <path
        d="M 60,42 C 130,22 230,46 340,36"
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
