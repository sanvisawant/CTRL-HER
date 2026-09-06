import React from "react";
import { useTranslation } from "react-i18next";
import { DakshaLogo } from "../../components/common/DakshaLogo";
import {
  Award,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Lock,
  CheckCircle2,
} from "lucide-react";

interface AuthBrandPanelProps {
  mode?: "login" | "signup";
}

export const AuthBrandPanel: React.FC<AuthBrandPanelProps> = ({ mode = "login" }) => {
  const { t } = useTranslation();

  const STEPS = [
    {
      title: "Competency",
      subtitle: "FRAC Benchmark Diagnostics",
      icon: Award,
      badge: "Step 01",
      color: "text-blue-400",
      bgColor: "bg-blue-900/60",
      borderColor: "border-blue-700/60",
    },
    {
      title: "Learning",
      subtitle: "Curated MoSPI & iGOT Pathways",
      icon: BookOpen,
      badge: "Step 02",
      color: "text-teal-400",
      bgColor: "bg-teal-900/60",
      borderColor: "border-teal-700/60",
    },
    {
      title: "Progress",
      subtitle: "Grounded Vector RAG & Quizzes",
      icon: TrendingUp,
      badge: "Step 03",
      color: "text-sky-400",
      bgColor: "bg-sky-900/60",
      borderColor: "border-sky-700/60",
    },
    {
      title: "Capability",
      subtitle: "Ministry Operational Readiness",
      icon: ShieldCheck,
      badge: "Step 04",
      color: "text-emerald-400",
      bgColor: "bg-emerald-900/60",
      borderColor: "border-emerald-700/60",
    },
  ];

  return (
    <aside
      aria-label="DAKSHA Brand Information"
      className="lg:col-span-5 gov-security-grid p-6 sm:p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6 lg:space-y-8 my-auto max-w-lg">
        {/* National Emblem & Ministry */}
        <div className="flex items-center gap-3.5 pb-4 lg:pb-5 border-b border-slate-800/80">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 p-2 flex items-center justify-center backdrop-blur-xs shadow-inner shrink-0">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 fill-current"
              aria-hidden="true"
            >
              <path d="M12 2L15 8H9L12 2Z" />
              <path d="M5 9C5 9 6 12 7 13C8 14 10 14 10 14L8 16L9 18L12 17L15 18L16 16L14 14C14 14 16 14 17 13C18 12 19 9 19 9H5Z" />
              <path d="M8 19H16V21C16 21.5 15.5 22 15 22H9C8.5 22 8 21.5 8 21V19Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-black text-amber-400">
              {t("gov_india")}
            </p>
            <p className="text-xs font-semibold text-slate-200 leading-tight mt-0.5">
              {t("ministry")}
            </p>
          </div>
        </div>

        {/* DAKSHA Core Monogram, Wordmark, and Descriptor */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center justify-center backdrop-blur-md shadow-lg brand-glow shrink-0 transition-transform duration-300 hover:scale-105">
              <DakshaLogo size={38} theme="dark" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-none">
                {t("brand")}
              </h1>
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-sky-400 mt-1">
                {t("tagline")}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed max-w-md hidden sm:block pt-1">
            Enterprise in-service competency intelligence platform powering national statistical capacity building and official APAR calibration for ISS/SSS officers.
          </p>
        </div>

        {/* Animated Capability Progression Track (Competency → Learning → Progress → Capability) */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/90 backdrop-blur-xs space-y-3 hidden sm:block">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Continuous Development Cycle
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              FRAC Framework
            </span>
          </div>

          <div className="relative pl-6 space-y-3">
            {/* Animated Connecting Beam */}
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="absolute w-full h-8 bg-gradient-to-b from-transparent via-cyan-400 to-transparent progression-beam" />
            </div>

            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative flex items-center gap-3 group">
                  {/* Step Node Dot */}
                  <div
                    className={`absolute -left-6 w-5 h-5 rounded-full ${step.bgColor} border ${step.borderColor} flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800/60 hover:bg-slate-800/70 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${step.color} shrink-0`} />
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">
                          {step.title}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                          {step.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                      {step.badge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {mode === "signup" && (
          <div className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-800/50 rounded-lg p-2.5 hidden sm:block">
            Official registration for MoSPI and affiliated cadre personnel. All officer credentials are authenticated against service records.
          </div>
        )}
      </div>

      {/* Institutional Security Footer */}
      <div className="relative z-10 pt-4 lg:pt-5 border-t border-slate-800/80 mt-4 lg:mt-6 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          <span>MoSPI Official Cadre Portal</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>256-bit Encrypted Session</span>
        </span>
      </div>
    </aside>
  );
};

export default AuthBrandPanel;
