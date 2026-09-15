import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  ArrowRight,
  BarChart3,
  BookOpen,
  Award,
  Sparkles,
  Download,
  ExternalLink,
  ChevronRight,
  Building2,
  CheckCircle2,
  Calendar,
  Layers,
  Lock,
} from "lucide-react";
import { DakshaLogo } from "../../components/common/DakshaLogo";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [fontSizeScale, setFontSizeScale] = useState<"normal" | "large" | "larger">("normal");
  const [lang, setLang] = useState<"en" | "hi">("en");

  const fontScaleClass =
    fontSizeScale === "large" ? "text-[105%]" : fontSizeScale === "larger" ? "text-[110%]" : "text-[100%]";

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 ${fontScaleClass}`}>
      {/* 1. Indian Tricolor Ribbon Bar */}
      <div className="w-full flex h-1.5" aria-hidden="true">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* 2. National Utility Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* State Emblem & Institutional Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 flex items-center justify-center text-amber-400">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                <path d="M12 2L15 8H9L12 2Z" />
                <path d="M5 9C5 9 6 12 7 13C8 14 10 14 10 14L8 16L9 18L12 17L15 18L16 16L14 14C14 14 16 14 17 13C18 12 19 9 19 9H5Z" />
                <path d="M8 19H16V21C16 21.5 15.5 22 15 22H9C8.5 22 8 21.5 8 21V19Z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-100 tracking-wide text-[11px] sm:text-xs">
              {lang === "hi" ? "भारत सरकार | सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय" : "Government of India | Ministry of Statistics & Programme Implementation"}
            </span>
            <span className="hidden md:inline-block text-slate-500">|</span>
            <span className="hidden md:inline-block text-slate-400 text-[11px]">
              {lang === "hi" ? "मिशन कर्मयोगी पहल" : "Mission Karmayogi Initiative"}
            </span>
          </div>

          {/* Right Utility: Accessibility & Language */}
          <div className="flex items-center gap-4 text-[11px] ml-auto">
            {/* Font scaling controls */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded px-2 py-0.5 border border-slate-700">
              <span className="text-slate-400 text-[10px] mr-1">Text:</span>
              <button
                type="button"
                onClick={() => setFontSizeScale("normal")}
                className={`px-1 rounded hover:text-white transition-colors ${fontSizeScale === "normal" ? "text-amber-400 font-bold" : "text-slate-400"}`}
                title="Default Font Size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale("large")}
                className={`px-1 rounded hover:text-white transition-colors ${fontSizeScale === "large" ? "text-amber-400 font-bold" : "text-slate-400"}`}
                title="Larger Font Size"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSizeScale("larger")}
                className={`px-1 rounded hover:text-white transition-colors ${fontSizeScale === "larger" ? "text-amber-400 font-bold" : "text-slate-400"}`}
                title="Maximum Font Size"
              >
                A++
              </button>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
            >
              {lang === "en" ? "हिन्दी" : "English"}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Brand Logo & Descriptor */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-800 p-1.5 flex items-center justify-center shadow-md shadow-blue-900/10 shrink-0">
              <DakshaLogo size={28} theme="dark" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-blue-950 font-serif">
                  DAKSHA
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200 tracking-wider uppercase">
                  MoSPI
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-tight">
                National Statistical Capacity Portal
              </p>
            </div>
          </Link>

          {/* Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#about" className="hover:text-blue-900 transition-colors">
              About
            </a>
            <a href="#pillars" className="hover:text-blue-900 transition-colors">
              Competency Framework
            </a>
            <a href="#lifecycle" className="hover:text-blue-900 transition-colors">
              Learning Lifecycle
            </a>
            <a href="#circulars" className="hover:text-blue-900 transition-colors">
              Circulars
            </a>
            <a href="#helpdesk" className="hover:text-blue-900 transition-colors">
              Helpdesk
            </a>
          </nav>

          {/* Right Action: Officer Login */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 hover:from-blue-950 hover:to-indigo-900 text-white font-bold text-sm shadow-md shadow-blue-900/20 hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>Officer Login</span>
              <ArrowRight className="w-4 h-4 text-blue-200" />
            </button>
          </div>
        </div>
      </header>

      {/* 4. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50/70 to-slate-100/50">
        {/* Subtle decorative grid mesh background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f015_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f015_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Mission Karmayogi Tagline Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Under the Auspices of Mission Karmayogi (NPCSCB)</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 font-serif leading-[1.15] tracking-tight">
                Strengthening India's <br />
                <span className="bg-gradient-to-r from-blue-900 via-indigo-800 to-blue-700 bg-clip-text text-transparent">
                  Statistical Foundation
                </span>{" "}
                Through Continuous Learning
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                A unified competency platform empowering Indian Statistical Service (ISS) & Subordinate Statistical Service (SSS) cadre officers with evidence-based diagnostics, verified survey methodologies, and targeted in-service capacity building.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="px-6 py-3.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-base shadow-lg shadow-blue-900/25 flex items-center gap-2.5 transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>Access Officer Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#pillars"
                  className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-base shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-slate-500" />
                  <span>View Competency Guidelines</span>
                </a>
              </div>

              {/* Trust Indicators / Ministry Badges */}
              <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-6 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Aligned to 33 MoSPI Cadre Roles</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>iGOT Karmayogi Accredited</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Evidence-Based Diagnostics</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic: Elevated Officer Competency Preview Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200 p-6 space-y-5">
                {/* Card Header: Official Status */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      SS
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Sanvi Sawant</p>
                      <p className="text-xs text-slate-500">Senior Statistical Officer (ISS)</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Cadre Level 4
                  </span>
                </div>

                {/* Competency Index Meter */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                      Verified Competency Index
                    </span>
                    <span className="font-extrabold text-blue-900 text-sm">88.4 / 100</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-700 to-indigo-600 h-full rounded-full w-[88%]" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>National Benchmark: 74.0</span>
                    <span className="text-emerald-600 font-bold">+14.4% Above Benchmark</span>
                  </div>
                </div>

                {/* Core Domain Breakdown */}
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Assessed Operational Strengths
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">NSS Survey Sampling Design</span>
                      <span className="font-bold text-slate-900">92%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full w-[92%]" />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">Field Scrutiny & Data Quality</span>
                      <span className="font-bold text-slate-900">89%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full w-[89%]" />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">National Accounts & Macro Indices</span>
                      <span className="font-bold text-slate-900">84%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full w-[84%]" />
                    </div>
                  </div>
                </div>

                {/* Accredited Milestone Pill */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="font-semibold text-blue-950">PLFS Sampling Calibration (2026)</span>
                  </div>
                  <span className="text-blue-700 font-bold">Certified</span>
                </div>
              </div>

              {/* Decorative background aura behind card */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl -z-10 blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Four Pillars of Statistical Excellence */}
      <section id="pillars" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-900 border border-blue-200 uppercase tracking-wider">
              Governance Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 font-serif">
              Four Pillars of Statistical Excellence
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Designed specifically to meet the statutory, technical, and operational training mandates of India's official statistical cadre.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1: Cadre Competency Calibration */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 text-blue-900 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Cadre Competency Calibration
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Standardized evaluation benchmarked against official MoSPI Directorate role profiles to objectively quantify field and analytical readiness.
                </p>
              </div>
              <div className="pt-6 mt-4 border-t border-slate-200/60 flex items-center text-xs font-bold text-blue-900">
                <span>Role-Mapped Profiles</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Pillar 2: Methodological Mastery */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 hover:shadow-md hover:border-amber-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 text-amber-900 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Methodological Mastery
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Deep training in NSS survey sampling design, Consumer Price Index (CPI) compilation, Periodic Labour Force Survey (PLFS) scrutiny, and national accounts.
                </p>
              </div>
              <div className="pt-6 mt-4 border-t border-slate-200/60 flex items-center text-xs font-bold text-amber-800">
                <span>Standardized Manuals</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Pillar 3: Official Knowledge In-Service Copilot */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-900 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Official Knowledge In-Service Copilot
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Immediate, verifiable clarification grounded strictly in published government manuals, technical gazettes, and official sampling instructions.
                </p>
              </div>
              <div className="pt-6 mt-4 border-t border-slate-200/60 flex items-center text-xs font-bold text-indigo-900">
                <span>Grounded Citations</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>

            {/* Pillar 4: Adaptive Career Pathways */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 hover:shadow-md hover:border-emerald-300 transition-all group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  Adaptive Career Pathways
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Self-paced micro-modules and diagnostic assessments aligned directly with cadre progression, APAR readiness, and senior operational postings.
                </p>
              </div>
              <div className="pt-6 mt-4 border-t border-slate-200/60 flex items-center text-xs font-bold text-emerald-800">
                <span>Cadre Progression</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How It Works (Cadre Learning Lifecycle) */}
      <section id="lifecycle" className="py-20 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-900 border border-indigo-200 uppercase tracking-wider">
              Operational Roadmap
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 font-serif">
              Cadre Learning & Diagnostic Lifecycle
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              A structured 3-stage progression ensuring every statistical officer achieves verified competency across core national metrics.
            </p>
          </div>

          {/* 3-Step Lifecycle Visual Progression Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-full bg-blue-900 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                  01
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  Diagnostic
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Skill Diagnostic & Calibration
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Officers complete situational baseline assessments across 33 operational competencies to identify specific domain gaps and strengths.
              </p>
              <div className="pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Layers className="w-3.5 h-3.5 text-blue-700" />
                  <span>33 Competency Indicators</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-full bg-indigo-800 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                  02
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  Capacity Building
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Dynamic Capacity Building
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Access curated, interactive micro-learning modules mapped to iGOT Karmayogi standards, covering field scrutiny, ASUSE, and national accounts.
              </p>
              <div className="pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Curated Learning Pathways</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm relative space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-full bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                  03
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Accreditation
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Cadre Milestone Certification
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Earn verifiable competency digital credentials endorsed by MoSPI training directorates to support annual performance appraisal readiness.
              </p>
              <div className="pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Award className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Verifiable In-Service Badges</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Recent Circulars & Official Announcements */}
      <section id="circulars" className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300 uppercase tracking-wider">
                Official Gazette & Notices
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-serif mt-2">
                Recent Circulars & Cadre Notifications
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-xs sm:text-sm font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>View All Official Circulars in Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Circulars List */}
          <div className="space-y-3.5">
            {/* Circular 1 */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    MoSPI/TRG/2026/04
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 14 September 2026
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Mandatory In-Service Competency Calibration for Junior Statistical Officers (SSS) - Cycle 2026-27
                </h4>
                <p className="text-xs text-slate-500">
                  Cadre Training Division • National Statistical Systems Training Academy (NSSTA)
                </p>
              </div>
              <button
                type="button"
                onClick={() => alert("Downloading Official Circular MoSPI/TRG/2026/04 (PDF)...")}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download PDF (480 KB)</span>
              </button>
            </div>

            {/* Circular 2 */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    MoSPI/ISS/SYS/88
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 02 September 2026
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Integration of DAKSHA Competency Assessments with iGOT Karmayogi SPV Platform
                </h4>
                <p className="text-xs text-slate-500">
                  Coordination & Systems Wing • Ministry of Statistics and Programme Implementation
                </p>
              </div>
              <button
                type="button"
                onClick={() => alert("Downloading Official Circular MoSPI/ISS/SYS/88 (PDF)...")}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download PDF (320 KB)</span>
              </button>
            </div>

            {/* Circular 3 */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    MoSPI/FOD/SOP/12
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 21 August 2026
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Adoption of Updated Field Scrutiny Guidelines for Annual Survey of Unincorporated Enterprises (ASUSE)
                </h4>
                <p className="text-xs text-slate-500">
                  Field Operations Division (FOD) • National Sample Survey (NSS)
                </p>
              </div>
              <button
                type="button"
                onClick={() => alert("Downloading Official Circular MoSPI/FOD/SOP/12 (PDF)...")}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download PDF (1.2 MB)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section id="about" className="py-16 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-amber-300">
            <Building2 className="w-3.5 h-3.5" />
            <span>Authorized MoSPI Officers & Cadre Personnel</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif tracking-tight">
            Ready to Calibrate Your Statistical Competencies?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Log in with your official cadre credentials (`@gov.in` / `@nic.in`) to access diagnostic assessments, accredited learning modules, and the in-service AI copilot.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 inline-flex items-center gap-2.5 transition-all cursor-pointer active:scale-[0.99]"
            >
              <span>Access DAKSHA Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 9. Official Footer */}
      <footer id="helpdesk" className="bg-slate-950 text-slate-300 text-xs pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Ministry Branding */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 p-1 flex items-center justify-center">
                  <DakshaLogo size={22} theme="dark" />
                </div>
                <span className="text-lg font-black text-white tracking-wider">DAKSHA</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Digital Assessment & Knowledge System for Holistic Advancement (DAKSHA). An official initiative by the Ministry of Statistics & Programme Implementation, Government of India.
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Meets Guidelines for Indian Government Websites (GIGW)</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Cadre Links</p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <button type="button" onClick={() => navigate("/login")} className="hover:text-white transition-colors cursor-pointer">
                    Officer Portal Login
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => navigate("/signup")} className="hover:text-white transition-colors cursor-pointer">
                    New Officer Onboarding
                  </button>
                </li>
                <li>
                  <a href="#pillars" className="hover:text-white transition-colors">
                    Competency Matrix
                  </a>
                </li>
                <li>
                  <a href="#circulars" className="hover:text-white transition-colors">
                    Published Circulars
                  </a>
                </li>
              </ul>
            </div>

            {/* External Portals */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">National Portals</p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a
                    href="https://www.mospi.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>MoSPI Official Web Portal</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.india.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>National Portal of India</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://igotkarmayogi.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <span>iGOT Karmayogi Bharat</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Support & Helpdesk */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Helpdesk & Support</p>
              <div className="space-y-1.5 text-xs text-slate-400">
                <p>Email: <span className="text-slate-200">daksha-support@nic.in</span></p>
                <p>Toll Free: <span className="text-slate-200">1800-11-2244</span> (9 AM - 6 PM)</p>
                <p className="text-[11px] text-slate-500 pt-1">
                  Khurshid Lal Bhawan, Janpath, New Delhi - 110001
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Legal & Copyright */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <a href="#about" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#about" className="hover:text-slate-300 transition-colors">Terms of Service</a>
              <span>•</span>
              <a href="#about" className="hover:text-slate-300 transition-colors">Accessibility Statement</a>
              <span>•</span>
              <a href="#about" className="hover:text-slate-300 transition-colors">Hyperlinking Policy</a>
            </div>
            <p className="text-center sm:text-right">
              Designed & Developed for Ministry of Statistics & Programme Implementation, Government of India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
