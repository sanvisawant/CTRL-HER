import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  api,
  type SkillGapAnalysisResponse,
  type OfficialProfileOut,
} from "../../services/api";
import { Button } from "../../components/common/Button";
import {
  Target,
  ArrowRight,
  CheckCircle2,
  Lock,
  Compass,
  BookOpen,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  Clock,
  Info,
} from "lucide-react";
import { MetricSkeleton } from "../../components/common/SkeletonLoader";

interface CompetencyScoreDisplay {
  name: string;
  category: string;
  current: number;
  target: number;
  gapPriority: "HIGH" | "MEDIUM" | "LOW";
  isFocus?: boolean;
}

// Baseline demo fallback data matching MoSPI statistical cadre profile
const DEMO_FALLBACK_COMPETENCIES: CompetencyScoreDisplay[] = [
  { name: "Sampling Methodology", category: "Statistical", current: 2.1, target: 4.0, gapPriority: "HIGH", isFocus: true },
  { name: "Data Quality", category: "Statistical", current: 3.7, target: 4.0, gapPriority: "LOW" },
  { name: "Statistical Analysis", category: "Statistical", current: 3.0, target: 4.0, gapPriority: "MEDIUM" },
  { name: "Data Visualization", category: "Technical", current: 4.1, target: 4.5, gapPriority: "LOW" },
  { name: "Decision Making", category: "Domain / Governance", current: 3.5, target: 4.0, gapPriority: "MEDIUM" },
];

export const JourneyView: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";

  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<OfficialProfileOut | null>(null);
  const [gapData, setGapData] = useState<SkillGapAnalysisResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadJourneyData = async () => {
      try {
        setLoading(true);
        let resolvedId = "2b574d66-f752-4348-ab00-17587012f291";

        try {
          const flow = await api.getConnectedLearnerFlow(cadreId);
          const identity = flow?.identity as any;
          if (identity?.p1_official_id || identity?.p1_user_id || identity?.canonical_user_id || identity?.canonical_id) {
            resolvedId = identity.p1_official_id || identity.p1_user_id || identity.canonical_user_id || identity.canonical_id;
          }
        } catch (err) {
          console.warn("Learner flow fetch fallback:", err);
        }

        const [gapsRes, profileRes] = await Promise.allSettled([
          api.getSkillGaps(resolvedId),
          api.getProfile(resolvedId),
        ]);

        if (isMounted) {
          if (gapsRes.status === "fulfilled") setGapData(gapsRes.value);
          if (profileRes.status === "fulfilled") setProfile(profileRes.value);
        }
      } catch (err) {
        console.warn("Error fetching journey competency data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadJourneyData();
    return () => {
      isMounted = false;
    };
  }, [cadreId]);

  // Derive active competencies: use backend data when available or demo fallback
  const competencies: CompetencyScoreDisplay[] = useMemo(() => {
    if (gapData?.gaps && gapData.gaps.length > 0) {
      // Find critical/high priority gaps first
      const sorted = [...gapData.gaps].sort((a, b) => (b.gap || 0) - (a.gap || 0));
      const topItems = sorted.slice(0, 5).map((g, idx) => ({
        name: g.competency_name,
        category: g.category || "Statistical",
        current: Number((g.current_score || 2.0).toFixed(1)),
        target: Number(((g.required_score || g.benchmark_score) ?? 4.0).toFixed(1)),
        gapPriority: g.priority || (g.gap > 1.5 ? "HIGH" : g.gap > 0.8 ? "MEDIUM" : "LOW"),
        isFocus: idx === 0,
      }));
      return topItems;
    }

    if (profile?.scores && profile.scores.length > 0) {
      return profile.scores.slice(0, 5).map((s, idx) => ({
        name: s.competency_name,
        category: s.category || "Statistical",
        current: Number(s.current_score.toFixed(1)),
        target: 4.0,
        gapPriority: s.current_score < 2.5 ? "HIGH" : s.current_score < 3.5 ? "MEDIUM" : "LOW",
        isFocus: idx === 0,
      }));
    }

    return DEMO_FALLBACK_COMPETENCIES;
  }, [gapData, profile]);

  // Current primary focus competency
  const focusCompetency = useMemo(() => {
    return competencies.find((c) => c.isFocus) || competencies[0] || DEMO_FALLBACK_COMPETENCIES[0];
  }, [competencies]);

  const officerName =
    user?.fullName && (user.fullName.toLowerCase().includes("sanvi") || user.fullName.toLowerCase().includes("siya") || user.fullName.toLowerCase().includes("keiyona"))
      ? (i18n.language === "hi" ? "सान्वी सावंत" : i18n.language === "mr" ? "सान्वी सावंत" : user.fullName)
      : user?.fullName || "Sanvi Sawant";

  const officerDesignation = user?.designation || "Senior Statistical Officer (ISS)";

  // Stage definitions for Main Journey Timeline
  const journeyStages = [
    {
      id: "01",
      number: "01",
      name: "DISCOVER",
      label: "Discover",
      description: "Understand your competency profile",
      status: "COMPLETED" as const,
      badge: "Completed",
    },
    {
      id: "02",
      number: "02",
      name: "ASSESS",
      label: "Assess",
      description: "Establish your baseline",
      status: "CURRENT" as const,
      badge: "Current Stage",
    },
    {
      id: "03",
      number: "03",
      name: "EXPERIENCE",
      label: "Experience",
      description: "Solve a realistic workplace challenge",
      status: "LOCKED" as const,
      badge: "Next Mission",
    },
    {
      id: "04",
      number: "04",
      name: "LEARN",
      label: "Learn",
      description: "Receive targeted learning through iGOT",
      status: "LOCKED" as const,
      badge: "iGOT Karmayogi",
    },
    {
      id: "05",
      number: "05",
      name: "RE-EXPERIENCE",
      label: "Re-Experience",
      description: "Apply what you learned",
      status: "LOCKED" as const,
      badge: "Work Scenario",
    },
    {
      id: "06",
      number: "06",
      name: "MASTER",
      label: "Master",
      description: "Measure your competency improvement",
      status: "LOCKED" as const,
      badge: "Mastery Check",
    },
  ];

  // Dynamic assessment mission description tailored to competency focus
  const dynamicMissionTitle = useMemo(() => {
    const name = focusCompetency.name.toLowerCase();
    if (name.includes("sampling")) {
      return {
        title: "Virtual Survey Design Mission",
        desc: "Apply sampling concepts in a realistic NSS field survey situation",
      };
    } else if (name.includes("quality") || name.includes("scrutiny")) {
      return {
        title: "Virtual Data Scrutiny Mission",
        desc: "Audit and validate administrative datasets for field inconsistencies",
      };
    } else if (name.includes("price") || name.includes("cpi")) {
      return {
        title: "Virtual Price Index Compilation Mission",
        desc: "Construct representative index baskets and handle outlier adjustments",
      };
    } else {
      return {
        title: `Virtual ${focusCompetency.name} Mission`,
        desc: `Apply ${focusCompetency.name} concepts in an authentic operational scenario`,
      };
    }
  }, [focusCompetency]);

  // Assessment progression stages
  const assessmentStages = [
    {
      id: "baseline",
      number: "01",
      title: "Baseline Assessment",
      subtitle: "Establish your starting competency",
      duration: "~5 min",
      status: "CURRENT" as const,
      detail: `Establish your current level in ${focusCompetency.name}`,
    },
    {
      id: "mission",
      number: "02",
      title: dynamicMissionTitle.title,
      subtitle: "Demonstrate your skills in a realistic scenario",
      duration: "~7 min",
      status: "LOCKED" as const,
      detail: dynamicMissionTitle.desc,
    },
    {
      id: "post_learning",
      number: "03",
      title: "Post-Learning Assessment",
      subtitle: "Apply what you learned",
      duration: "~5 min",
      status: "LOCKED" as const,
      detail: "Demonstrate validated improvement after targeted iGOT training",
    },
    {
      id: "mastery",
      number: "04",
      title: "Mastery Check",
      subtitle: "Measure your final competency",
      duration: "~5 min",
      status: "LOCKED" as const,
      detail: `Confirm certified mastery in ${focusCompetency.name}`,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ──────────────────────────────────────────────────────────────────────
          1. JOURNEY HERO & LANDING HEADER
      ────────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="journey-heading" className="daksha-glass-navy rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        {/* Subtle decorative security grid background */}
        <div className="absolute inset-0 gov-guilloche-pattern opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Personalized Officer Pathway • MoSPI Cadre</span>
            </div>

            <h1 id="journey-heading" className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Your DAKSHA Journey
            </h1>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
              Discover your strengths, experience realistic work challenges, learn where you need it, and measure your progress.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Officer: <strong>{officerName}</strong></span>
              </span>
              <span>•</span>
              <span>{officerDesignation}</span>
              <span>•</span>
              <span className="font-mono text-slate-300">Cadre ID: {cadreId}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              variant="saffron"
              size="lg"
              onClick={() => navigate("/assessment")}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="shadow-md hover:shadow-lg transition-all"
            >
              Start Baseline Assessment
            </Button>
            <Link to="/competency">
              <Button variant="outlineInvert" size="lg" className="w-full sm:w-auto">
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          2 & 3. COMPETENCY SNAPSHOT & CURRENT FOCUS GRID
      ────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Competency Snapshot (Top Left/Center 7 cols) */}
        <section aria-labelledby="snapshot-heading" className="lg:col-span-7 daksha-glass rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200/80 mb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                Cadre Skill Overview
              </span>
              <h2 id="snapshot-heading" className="text-lg font-bold text-slate-900">
                Your Competency Profile
              </h2>
            </div>
            <Link
              to="/competency"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline"
            >
              <span>Explore 33 MoSPI Skills</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <MetricSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {competencies.map((item) => {
                const scorePercent = Math.min(100, Math.max(0, (item.current / 5.0) * 100));
                const targetPercent = Math.min(100, Math.max(0, (item.target / 5.0) * 100));

                return (
                  <div
                    key={item.name}
                    className={`p-3.5 rounded-lg transition-all ${item.isFocus
                        ? "bg-blue-50/90 border border-blue-200/90 shadow-xs"
                        : "bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/60"
                      }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        {item.isFocus && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300/60">
                            Primary Focus
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">({item.category})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {item.current.toFixed(1)} <span className="text-slate-400 font-normal">/ 5</span>
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${item.gapPriority === "HIGH"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : item.gapPriority === "MEDIUM"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                        >
                          {item.gapPriority} GAP
                        </span>
                      </div>
                    </div>

                    {/* Score Bar with Target Marker */}
                    <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.isFocus ? "bg-amber-600" : "bg-blue-900"
                          }`}
                        style={{ width: `${scorePercent}%` }}
                      />
                      {/* Target indicator mark */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-700"
                        style={{ left: `${targetPercent}%` }}
                        title={`Target: ${item.target} / 5`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Current Competency Focus (Top Right 5 cols) */}
        <section aria-labelledby="focus-heading" className="lg:col-span-5 daksha-glass-elevated rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
                <Target className="w-3.5 h-3.5 text-amber-700" />
                CURRENT COMPETENCY FOCUS
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                GAP: {focusCompetency.gapPriority}
              </span>
            </div>

            <div>
              <h3 id="focus-heading" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {focusCompetency.name}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                NSSO multi-stage stratified survey sampling theory, allocation formulae, multiplier computations, and estimation weights.
              </p>
            </div>

            {/* Score Comparison Cards */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 block">Current Level</span>
                <div className="text-2xl font-black text-blue-950 mt-0.5">
                  {focusCompetency.current.toFixed(1)} <span className="text-xs font-semibold text-slate-400">/ 5</span>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold block mt-1">Starting Baseline</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 block">Target Level</span>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {focusCompetency.target.toFixed(1)} <span className="text-xs font-semibold text-slate-400">/ 5</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">MoSPI Cadre Standard</span>
              </div>
            </div>

            {/* Subtle Progress Visualization */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Current</span>
                <span>Target</span>
              </div>

              <div className="relative pt-1">
                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-amber-600 rounded-l-full"
                    style={{ width: `${(focusCompetency.current / 5.0) * 100}%` }}
                  />
                  <div
                    className="h-full bg-slate-300/70"
                    style={{
                      width: `${((focusCompetency.target - focusCompetency.current) / 5.0) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-0.5 font-mono">
                <span>{focusCompetency.current.toFixed(1)}</span>
                <span>{focusCompetency.target.toFixed(1)}</span>
              </div>
            </div>

            {/* Direct Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => navigate("/assessment")}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Start Baseline Assessment →
              </Button>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                5 targeted scenario questions to calibrate your competency baseline.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          4. MAIN JOURNEY TIMELINE (6 STAGES)
      ────────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="timeline-heading" className="daksha-glass rounded-xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
              Continuous Progression Model
            </span>
            <h2 id="timeline-heading" className="text-xl font-bold text-slate-900 tracking-tight">
              Main Journey Timeline
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              Completed
            </span>
            <span className="mx-1">•</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-900 inline-block" />
              Current
            </span>
            <span className="mx-1">•</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              Locked
            </span>
          </div>
        </div>

        {/* Desktop / Tablet Horizontal Progression Track */}
        <div className="hidden md:block">
          <div className="grid grid-cols-6 gap-3 relative">
            {/* Horizontal Track Background Line */}
            <div className="absolute top-7 left-8 right-8 h-0.5 bg-slate-200 z-0" />
            <div className="absolute top-7 left-8 w-1/6 h-0.5 bg-emerald-500 z-0" />

            {journeyStages.map((stage) => {
              const isCompleted = stage.status === "COMPLETED";
              const isCurrent = stage.status === "CURRENT";

              return (
                <div
                  key={stage.id}
                  className={`relative z-10 flex flex-col p-4 rounded-xl transition-all duration-200 ${isCurrent
                      ? "daksha-glass-elevated border-2 border-blue-900 ring-2 ring-blue-900/10 active-stage-beacon"
                      : isCompleted
                        ? "bg-white border border-emerald-200 shadow-xs"
                        : "daksha-glass-locked text-slate-500"
                    }`}
                >
                  {/* Step Node Icon / Status Indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-transform ${isCompleted
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isCurrent
                            ? "bg-blue-900 text-white shadow-md scale-110"
                            : "bg-slate-200 text-slate-500 border border-slate-300"
                        }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isCurrent ? (
                        <span>{stage.number}</span>
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isCompleted
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isCurrent
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      {stage.status}
                    </span>
                  </div>

                  {/* Stage Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block">
                      STAGE {stage.number}
                    </span>
                    <h4
                      className={`text-sm font-bold tracking-tight ${isCurrent
                          ? "text-blue-950 font-black"
                          : isCompleted
                            ? "text-slate-900"
                            : "text-slate-500"
                        }`}
                    >
                      {stage.name}
                    </h4>
                    <p className="text-[11px] leading-snug text-slate-600">
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Vertical Progression Track */}
        <div className="md:hidden space-y-3">
          {journeyStages.map((stage) => {
            const isCompleted = stage.status === "COMPLETED";
            const isCurrent = stage.status === "CURRENT";

            return (
              <div
                key={stage.id}
                className={`relative flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${isCurrent
                    ? "bg-white border-blue-900 ring-2 ring-blue-900/10 shadow-sm"
                    : isCompleted
                      ? "bg-white border-emerald-200"
                      : "daksha-glass-locked"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                        ? "bg-blue-900 text-white shadow-sm"
                        : "bg-slate-200 text-slate-500"
                    }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <span>{stage.number}</span>
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-sm font-bold ${isCurrent
                          ? "text-blue-950"
                          : isCompleted
                            ? "text-slate-900"
                            : "text-slate-500"
                        }`}
                    >
                      {stage.number} {stage.name}
                    </h4>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isCompleted
                          ? "bg-emerald-50 text-emerald-700"
                          : isCurrent
                            ? "bg-amber-100 text-amber-900"
                            : "bg-slate-100 text-slate-400"
                        }`}
                    >
                      {stage.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{stage.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          5 & 6. ASSESSMENT TIMELINE (COMPETENCY-SPECIFIC)
      ────────────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="assessment-heading" className="daksha-glass rounded-xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
              Longitudinal Competency Evaluation
            </span>
            <h2 id="assessment-heading" className="text-xl font-bold text-slate-900 tracking-tight">
              Your Assessment Journey
            </h2>
            <p className="text-xs text-slate-600">
              DAKSHA evaluates competency across four progressive milestones—not a one-time test.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold">
            <Target className="w-3.5 h-3.5 text-blue-700" />
            <span>Focus: <strong>{focusCompetency.name}</strong></span>
          </div>
        </div>

        {/* 4-Stage Assessment Progression Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {assessmentStages.map((stg) => {
            const isCurrent = stg.status === "CURRENT";

            return (
              <div
                key={stg.id}
                className={`p-5 rounded-xl transition-all relative flex flex-col justify-between ${isCurrent
                    ? "daksha-glass-elevated border-2 border-blue-900 shadow-md ring-2 ring-blue-900/10"
                    : "daksha-glass-locked text-slate-500"
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent
                          ? "bg-blue-900 text-white"
                          : "bg-slate-200 text-slate-500 border border-slate-300"
                        }`}
                    >
                      {stg.number}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {stg.duration}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${isCurrent ? "text-amber-700" : "text-slate-400"
                        }`}
                    >
                      {isCurrent ? "● CURRENT STAGE" : "○ UPCOMING"}
                    </span>
                    <h4
                      className={`text-base font-bold tracking-tight mt-0.5 ${isCurrent ? "text-blue-950 font-black" : "text-slate-700"
                        }`}
                    >
                      {stg.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 font-medium">{stg.subtitle}</p>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{stg.detail}</p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/70">
                  {isCurrent ? (
                    <Button
                      variant="saffron"
                      size="sm"
                      fullWidth
                      onClick={() => navigate("/assessment")}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Start Baseline Assessment →
                    </Button>
                  ) : (
                    <div className="text-center py-1.5 text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Unlocks after prior stage</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
          8 & 9. "WHAT HAPPENS NEXT?" & iGOT POSITIONING ARCHITECTURE
      ────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* What Happens Next? (7 cols) */}
        <section aria-labelledby="steps-heading" className="lg:col-span-7 daksha-glass rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-900">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 id="steps-heading" className="text-lg font-bold text-slate-900">
                  What happens next?
                </h3>
                <p className="text-xs text-slate-500">The 6-step DAKSHA competency lifecycle</p>
              </div>
            </div>

            <ol className="space-y-2.5">
              {[
                { step: "1", text: "DAKSHA establishes your competency baseline." },
                { step: "2", text: "You'll solve a realistic workplace challenge." },
                { step: "3", text: "DAKSHA identifies where you need improvement." },
                { step: "4", text: "Relevant learning is recommended through the iGOT ecosystem." },
                { step: "5", text: "You return to DAKSHA for a new assessment." },
                { step: "6", text: "Your competency profile is updated based on your performance." },
              ].map((item) => (
                <li
                  key={item.step}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 text-xs text-slate-800"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <span className="font-medium leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Ready to establish your baseline?</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/assessment")}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Start Baseline Assessment →
            </Button>
          </div>
        </section>

        {/* iGOT Ecosystem Positioning & Architecture (5 cols) */}
        <section aria-labelledby="igot-positioning-heading" className="lg:col-span-5 daksha-glass rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center text-teal-900">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 id="igot-positioning-heading" className="text-lg font-bold text-slate-900">
                  DAKSHA + iGOT Ecosystem
                </h3>
                <p className="text-xs text-slate-500">Intelligent assessment paired with national training</p>
              </div>
            </div>

            {/* Architecture Split Display */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-blue-50/80 rounded-lg border border-blue-200">
                <span className="font-bold text-blue-950 block text-[11px] uppercase tracking-wider mb-1">
                  DAKSHA
                </span>
                <ul className="space-y-1 text-[11px] text-slate-700">
                  <li>• Competency profiling</li>
                  <li>• Diagnostic assessment</li>
                  <li>• Gap detection</li>
                  <li>• Virtual work missions</li>
                  <li>• Growth measurement</li>
                </ul>
              </div>

              <div className="p-3 bg-teal-50/80 rounded-lg border border-teal-200">
                <span className="font-bold text-teal-950 block text-[11px] uppercase tracking-wider mb-1">
                  iGOT Karmayogi
                </span>
                <ul className="space-y-1 text-[11px] text-slate-700">
                  <li>• Government learning courses</li>
                  <li>• Training content & modules</li>
                  <li>• Certified curriculum</li>
                  <li>• Line ministry workshops</li>
                  <li>• Official learning credit</li>
                </ul>
              </div>
            </div>

            {/* End-to-End Conceptual Flow Pill Sequence */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Operational Lifecycle
              </span>
              <div className="text-[11px] font-semibold text-slate-800 leading-relaxed font-mono">
                DAKSHA → ASSESS → VIRTUAL MISSION → IDENTIFY GAP → RECOMMEND → iGOT → LEARN → RETURN TO DAKSHA → RE-ASSESS
              </div>
            </div>

            {/* Judge-Safe Architecture Disclosure Note */}
            <div className="p-3 rounded-lg bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Adapter Integration Architecture:</strong> Our platform uses an adapter-based integration layer. Currently, the iGOT APIs are simulated using a mock service for demonstration, and the same adapter can be switched to the official iGOT APIs once authorized access is provided.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Link to="/igot-learning">
              <Button variant="outline" size="sm" fullWidth leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
                Explore Connected iGOT Pathways
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default JourneyView;
