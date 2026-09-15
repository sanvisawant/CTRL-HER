import React from "react";
import { useTranslation } from "react-i18next";
import { DakshaLogo } from "../../components/common/DakshaLogo";
import {
  BarChart3,
  Zap,
  Target,
  Lock,
  ShieldCheck,
} from "lucide-react";

interface AuthBrandPanelProps {
  mode?: "login" | "signup";
}

export const AuthBrandPanel: React.FC<AuthBrandPanelProps> = ({ mode: _mode = "login" }) => {
  const { t } = useTranslation();

  return (
    <aside
      aria-label="DAKSHA Brand Information"
      className="lg:col-span-5 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden shrink-0 h-full border-b lg:border-b-0 lg:border-r border-slate-800/80"
    >
      {/* Soft glowing ambient meshes */}
      <div className="absolute top-0 -left-10 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col h-full justify-between gap-6">
        {/* Top Header: MoSPI Emblem & National Insignia */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-amber-400 fill-current" aria-hidden="true">
                <path d="M12 2L15 8H9L12 2Z" />
                <path d="M5 9C5 9 6 12 7 13C8 14 10 14 10 14L8 16L9 18L12 17L15 18L16 16L14 14C14 14 16 14 17 13C18 12 19 9 19 9H5Z" />
                <path d="M8 19H16V21C16 21.5 15.5 22 15 22H9C8.5 22 8 21.5 8 21V19Z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-400">
                {t("gov_india", "GOVERNMENT OF INDIA")}
              </p>
              <p className="text-xs font-semibold text-slate-200 leading-tight mt-0.5">
                {t("ministry", "Ministry of Statistics and Programme Implementation")}
              </p>
            </div>
          </div>
        </div>

        {/* Center: DAKSHA Logo, Title, Subtitle, and 3 Feature Badges */}
        <div className="space-y-6 my-auto py-2">
          {/* Brand Logo Row */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 p-2 flex items-center justify-center shadow-md shadow-indigo-950/40 backdrop-blur-xs">
              <DakshaLogo size={36} theme="dark" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  DAKSHA
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 tracking-wide uppercase">
                  AI Learning Platform
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                Digital Assessment & Knowledge System for Holistic Advancement
              </p>
            </div>
          </div>

          {/* Institutional Headline & Subtext */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight">
              Building Capability <br />
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                for Better Statistics
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
              Empowering India's statistical cadre with AI-calibrated competency diagnostics, personalized learning pathways, and verifiable in-service credentials.
            </p>
          </div>

          {/* 3 Sleek Floating Feature Highlights */}
          <div className="space-y-2.5 pt-2">
            {/* 1. Evidence-Based Diagnostics */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Evidence-Based Diagnostics</p>
                <p className="text-[11px] text-slate-400">Statistical competency twin benchmarked to 33 MoSPI skills</p>
              </div>
            </div>

            {/* 2. iGOT Adaptive Pathways */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 text-violet-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">iGOT Adaptive Pathways</p>
                <p className="text-[11px] text-slate-400">Intelligent curation connected with Karmayogi Bharat modules</p>
              </div>
            </div>

            {/* 3. Cadre Gamified Mastery */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-all">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Cadre Gamified Mastery</p>
                <p className="text-[11px] text-slate-400">Daily micro-checks, streak rewards, and peer leaderboards</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Discreet Security Pill */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-300">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>256-bit Encrypted Session • MoSPI Cadre Gateway</span>
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Gov.in Verified</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

export default AuthBrandPanel;
