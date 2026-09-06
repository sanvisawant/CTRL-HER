import React from "react";
import { useTranslation } from "react-i18next";
import { DakshaLogo } from "../../components/common/DakshaLogo";
import { BarChart2, BookOpenCheck, Landmark, Lock, CheckCircle2 } from "lucide-react";

interface AuthBrandPanelProps {
  mode?: "login" | "signup";
}

// ─── Static data for background visualization ──────────────────────────────
// Simplified abstract India silhouette as a data-point path
const INDIA_PATH =
  "M195,42 L205,38 L218,42 L225,52 L230,65 L238,72 L245,80 L250,95 L248,110 L255,118 L260,130 L258,145 L250,158 L242,170 L238,182 L230,195 L222,210 L215,225 L210,238 L205,250 L200,262 L195,275 L188,262 L182,250 L178,238 L172,225 L165,210 L158,195 L152,182 L148,170 L142,158 L138,145 L135,130 L132,118 L136,110 L135,95 L140,80 L148,72 L155,65 L160,52 L170,42 L180,38 Z";

// Data network nodes
const NODES = [
  { x: 60,  y: 60,  r: 2.5 },
  { x: 130, y: 35,  r: 2   },
  { x: 200, y: 55,  r: 3   },
  { x: 280, y: 40,  r: 2   },
  { x: 340, y: 80,  r: 2.5 },
  { x: 60,  y: 140, r: 2   },
  { x: 115, y: 100, r: 2   },
  { x: 170, y: 130, r: 3.5 },
  { x: 240, y: 110, r: 2   },
  { x: 310, y: 130, r: 2   },
  { x: 370, y: 100, r: 2   },
  { x: 80,  y: 210, r: 2   },
  { x: 150, y: 195, r: 2.5 },
  { x: 220, y: 185, r: 2   },
  { x: 290, y: 200, r: 3   },
  { x: 360, y: 175, r: 2   },
  { x: 100, y: 280, r: 2   },
  { x: 175, y: 265, r: 2   },
  { x: 250, y: 275, r: 2.5 },
  { x: 330, y: 260, r: 2   },
  { x: 390, y: 230, r: 2   },
];

const EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,6],[1,6],[2,7],[3,8],[4,9],[4,10],
  [5,6],[6,7],[7,8],[8,9],[9,10],
  [5,11],[6,12],[7,12],[7,13],[8,13],[9,14],[10,15],
  [11,12],[12,13],[13,14],[14,15],
  [11,16],[12,17],[13,17],[13,18],[14,19],[15,20],
  [16,17],[17,18],[18,19],[19,20],
];

const BARS = [0.35, 0.55, 0.42, 0.68, 0.52, 0.75, 0.60, 0.82, 0.70, 0.88];
const LINE_PTS = [10,290, 60,265, 110,272, 160,250, 210,258, 260,240, 310,245, 360,228, 410,235];
const LINE_LEN = 1200;

function buildLinePath(pts: number[]) {
  return pts.reduce((d, v, i) =>
    d + (i % 2 === 0 ? (i === 0 ? `M${v}` : ` L${v}`) : `,${v}`),
  "");
}

const PRINCIPLES = [
  { icon: BarChart2,     key: "auth.panel_principle_1", fallback: "Evidence-Based",     color: "text-sky-400"   },
  { icon: BookOpenCheck, key: "auth.panel_principle_2", fallback: "Capability Building", color: "text-teal-400"  },
  { icon: Landmark,      key: "auth.panel_principle_3", fallback: "Better Governance",  color: "text-amber-400" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export const AuthBrandPanel: React.FC<AuthBrandPanelProps> = ({ mode = "login" }) => {
  const { t } = useTranslation();

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const linePath = buildLinePath(LINE_PTS);

  return (
    <aside
      aria-label="DAKSHA Brand Information"
      className="lg:col-span-5 gov-security-grid p-4 sm:p-6 lg:p-8 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0 h-full"
    >
      {/* ── Statistical Intelligence Visualization (SVG background) ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: reducedMotion ? 0.25 : 1 }}
      >
        <svg
          viewBox="0 0 420 320"
          preserveAspectRatio="xMidYMid slice"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Faint India outline — barely visible, constructed from data path */}
          <path
            d={INDIA_PATH}
            fill="none"
            stroke="rgba(148,163,184,0.06)"
            strokeWidth="14"
            strokeLinejoin="round"
          />
          <path
            d={INDIA_PATH}
            fill="none"
            stroke="rgba(99,179,237,0.05)"
            strokeWidth="1.5"
            strokeDasharray="3 7"
            strokeLinejoin="round"
          />

          {/* Data network edges */}
          {EDGES.map(([a, b], i) => (
            <line
              key={i}
              x1={NODES[a].x} y1={NODES[a].y}
              x2={NODES[b].x} y2={NODES[b].y}
              stroke="rgba(148,163,184,0.09)"
              strokeWidth="0.75"
            />
          ))}

          {/* Data network nodes */}
          {NODES.map((n, i) => (
            <circle
              key={i}
              cx={n.x} cy={n.y} r={n.r}
              fill="rgba(99,179,237,0.50)"
              className={`stat-node stat-node-${(i % 3) + 1}`}
            />
          ))}

          {/* Background bar chart (very faint, bottom-left corner) */}
          {BARS.map((h, i) => (
            <rect
              key={i}
              x={16 + i * 16}
              y={310 - h * 55}
              width={9}
              height={h * 55}
              rx="1"
              fill="rgba(99,179,237,0.06)"
              className={`stat-bar stat-bar-${(i % 3) + 1}`}
            />
          ))}

          {/* Slow-draw line chart */}
          <path
            d={linePath}
            fill="none"
            stroke="rgba(99,179,237,0.05)"
            strokeWidth="1.5"
          />
          {!reducedMotion && (
            <path
              d={linePath}
              fill="none"
              stroke="rgba(99,179,237,0.20)"
              strokeWidth="1.5"
              strokeDasharray={LINE_LEN}
              strokeDashoffset={LINE_LEN}
              className="stat-line-draw"
            />
          )}

          {/* Tricolor accent streams (bottom edge, very subtle) */}
          <path
            d="M0,305 Q105,295 210,302 Q315,308 420,298"
            fill="none"
            stroke="rgba(255,153,51,0.16)"
            strokeWidth="1.2"
            className={reducedMotion ? "" : "tricolor-stream-1"}
          />
          <path
            d="M0,310 Q105,302 210,308 Q315,314 420,305"
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
          <path
            d="M0,315 Q105,308 210,314 Q315,320 420,311"
            fill="none"
            stroke="rgba(19,136,8,0.18)"
            strokeWidth="1.2"
            className={reducedMotion ? "" : "tricolor-stream-2"}
          />

          {/* Subtle data pulse rings on key nodes */}
          {!reducedMotion && [2, 7, 14].map((ni, pi) => (
            <circle
              key={pi}
              cx={NODES[ni].x} cy={NODES[ni].y}
              r={NODES[ni].r + 5}
              fill="none"
              stroke="rgba(99,179,237,0.22)"
              strokeWidth="1"
              className={`stat-pulse stat-pulse-${pi + 1}`}
            />
          ))}
        </svg>
      </div>

      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-16 left-0 w-60 h-60 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      {/* ── Foreground content ── */}
      <div className="relative z-10 flex flex-col h-full justify-between gap-3 sm:gap-4">

        {/* Government header */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/15 p-1.5 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-400 fill-current" aria-hidden="true">
              <path d="M12 2L15 8H9L12 2Z" />
              <path d="M5 9C5 9 6 12 7 13C8 14 10 14 10 14L8 16L9 18L12 17L15 18L16 16L14 14C14 14 16 14 17 13C18 12 19 9 19 9H5Z" />
              <path d="M8 19H16V21C16 21.5 15.5 22 15 22H9C8.5 22 8 21.5 8 21V19Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-amber-400">
              {t("gov_india")}
            </p>
            <p className="text-xs font-semibold text-slate-200 leading-tight mt-0.5">
              {t("ministry")}
            </p>
          </div>
        </div>

        {/* DAKSHA brand + main message */}
        <div className="flex-1 flex flex-col justify-center space-y-3.5 sm:space-y-4">
          {/* Brand row */}
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-white/8 border border-white/15 p-1.5 flex items-center justify-center brand-glow shrink-0">
              <DakshaLogo size={32} theme="dark" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
                {t("brand")}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-sky-400 mt-0.5">
                {t("tagline")}
              </p>
            </div>
          </div>

          {/* Main institutional headline */}
          <div className="space-y-1.5 max-w-xs">
            <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">
              {t("auth.panel_headline_line1", "Building Capability")}<br />
              <span className="text-sky-300">
                {t("auth.panel_headline_line2", "for Better Statistics")}
              </span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed hidden sm:block">
              {t(
                "auth.panel_subtext",
                "Strengthening the skills, knowledge and digital capabilities of India's statistical workforce."
              )}
            </p>
          </div>

          {/* Signup notice */}
          {mode === "signup" && (
            <div className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded-lg p-2 hidden sm:block">
              {t(
                "auth.panel_signup_notice",
                "Official registration for MoSPI and affiliated cadre personnel. All officer credentials are verified against service records."
              )}
            </div>
          )}
        </div>

        {/* Institutional principles (replaced 4-step cycle) */}
        <div className="hidden sm:block space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            {t("auth.panel_principles_label", "Institutional Framework")}
          </p>
          {PRINCIPLES.map(({ icon: Icon, key, fallback, color }) => (
            <div key={key} className="flex items-center gap-2.5 py-0.5">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-200">
                {t(key, fallback)}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>{t("auth.panel_footer_portal", "MoSPI Official Cadre Portal")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>{t("auth.panel_footer_security", "256-bit Encrypted Session")}</span>
          </span>
        </div>

      </div>
    </aside>
  );
};

export default AuthBrandPanel;


