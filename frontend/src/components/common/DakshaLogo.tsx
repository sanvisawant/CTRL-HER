import React from "react";

interface DakshaLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  showDescriptor?: boolean;
  theme?: "light" | "dark" | "auto";
  animate?: boolean;
}

export const DakshaLogo: React.FC<DakshaLogoProps> = ({
  size = 36,
  className = "",
  showWordmark = false,
  showDescriptor = false,
  theme = "auto",
}) => {
  // Unique SVG IDs so multiple instances don't collide
  const id = React.useId().replace(/:/g, "");

  const textColor =
    theme === "dark"
      ? "text-white"
      : theme === "light"
      ? "text-blue-950"
      : "text-blue-950 dark:text-white";

  const subtextColor =
    theme === "dark"
      ? "text-sky-400"
      : theme === "light"
      ? "text-sky-700"
      : "text-sky-700 dark:text-sky-400";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Precision Geometric DAKSHA Monogram SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="DAKSHA Logo"
        role="img"
      >
        <title>DAKSHA — AI-Powered Competency & Learning Platform</title>
        <defs>
          {/* Foundation Pillar Gradient */}
          <linearGradient id={`daksha-pillar-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="60%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Lower Progression Arc (Foundational to Applied Competency) */}
          <linearGradient id={`daksha-arc-b-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Upper Horizon Arc (Strategic Mastery & Knowledge) */}
          <linearGradient id={`daksha-arc-t-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="60%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          {/* Excellence & Leadership Spark Accent */}
          <linearGradient id={`daksha-spark-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>

          {/* Subtle Glow Filter for Tech Accent */}
          <filter id={`daksha-glow-${id}`} x1="-20%" y1="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0284C7" floodOpacity="0.25" />
          </filter>
        </defs>

        <g filter={`url(#daksha-glow-${id})`}>
          {/* 1. Structural Foundation Pillar (Left Spine of D) */}
          <rect
            x="5"
            y="6"
            width="7"
            height="36"
            rx="3.5"
            fill={`url(#daksha-pillar-${id})`}
          />

          {/* 2. Lower Learning Arc (Foundation to Mastery) */}
          <path
            d="M 16 42 H 27 C 36.39 42 44 34.39 44 25 C 44 23.6 43.83 22.25 43.5 20.95 L 36.8 22.8 C 36.93 23.5 37 24.24 37 25 C 37 30.52 32.52 35 27 35 H 16 V 42 Z"
            fill={`url(#daksha-arc-b-${id})`}
          />

          {/* 3. Upper Knowledge Horizon (Strategic Cadre Capability) */}
          <path
            d="M 16 6 H 27 C 35.8 6 43.08 12.7 43.9 21.3 L 37.1 22.8 C 36.5 16.7 32.2 13 27 13 H 16 V 6 Z"
            fill={`url(#daksha-arc-t-${id})`}
          />

          {/* 4. Ascending Competency Trajectory (3 Stepped Growth Levels inside D) */}
          {/* Level 1: Foundational */}
          <rect x="16.5" y="28" width="4.5" height="5" rx="1.2" fill="#2563EB" />
          {/* Level 2: Applied */}
          <rect x="22.5" y="23" width="4.5" height="10" rx="1.2" fill="#0284C7" />
          {/* Level 3: Strategic Mastery */}
          <rect x="28.5" y="18" width="4.5" height="15" rx="1.2" fill="#0EA5E9" />

          {/* 5. Golden Mastery Apex Spark */}
          <circle cx="34.5" cy="13.5" r="2.5" fill={`url(#daksha-spark-${id})`} />
        </g>
      </svg>

      {/* Optional Wordmark and Descriptor */}
      {showWordmark && (
        <div className="flex flex-col">
          <span
            className={`font-black tracking-tight leading-none ${textColor}`}
            style={{ fontSize: Math.max(16, Math.round(size * 0.58)) }}
          >
            DAKSHA
          </span>
          {showDescriptor && (
            <span
              className={`font-semibold uppercase tracking-wider mt-1 ${subtextColor}`}
              style={{ fontSize: Math.max(9, Math.round(size * 0.22)) }}
            >
              AI-Powered Competency &amp; Learning Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DakshaLogo;
