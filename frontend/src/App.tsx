import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import "./i18n/config";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./features/auth/Login";
import { Signup } from "./features/auth/Signup";
import {
  Sparkles,
  TrendingUp,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  FileCheck,
  FileEdit,
  Clock,
  HelpCircle,
  Play,
  ArrowRight,
  ArrowUpRight,
  ArrowUp,
  Info,
  AlertTriangle,
  PlusCircle,
} from "lucide-react";

// Real Unified Feature Views
import JourneyView from "./features/journey/JourneyView";
import CompetencyView from "./features/competency/CompetencyView";
import LearningView from "./features/learning/LearningView";
import AIAssistantView from "./features/assistant/AIAssistantView";
import AssessmentView from "./features/assessment/AssessmentView";
import AnalyticsView from "./features/analytics/AnalyticsView";
import QuestView from "./features/quest/QuestView";
import IGOTLearning from "./features/igot/IGOTLearning";
import TrainerQuestionBankView from "./features/trainer/TrainerQuestionBankView";
import AdminUserManagementView from "./features/admin/AdminUserManagementView";
import { RoleProtectedRoute } from "./components/common/RoleProtectedRoute";

import { ErrorState } from "./components/common/ErrorState";
import { MetricSkeleton, CardSkeleton } from "./components/common/SkeletonLoader";

import {
  api,
  type ConnectedLearnerFlowResponse,
  type QuestHomeData,
} from "./services/api";

// Modern SaaS Government Learner Dashboard View matching Reference Design
const DashboardView = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";

  const [flowData, setFlowData] = useState<ConnectedLearnerFlowResponse | null>(null);
  const [questData, setQuestData] = useState<QuestHomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copilotQuery, setCopilotQuery] = useState<string>("");

  const fetchDashboardState = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const [flowRes, questRes] = await Promise.allSettled([
        api.getConnectedLearnerFlow(cadreId),
        api.getQuestHome(cadreId),
      ]);
      if (flowRes.status === "fulfilled") {
        setFlowData(flowRes.value);
      }
      if (questRes.status === "fulfilled") {
        setQuestData(questRes.value);
      }
      if (flowRes.status === "rejected" && questRes.status === "rejected") {
        setFetchError("Unable to establish live connection to backend intelligence. Baseline cadre benchmarks are displayed.");
      }
    } catch (err) {
      console.warn("Dashboard fetch error:", err);
      setFetchError("Unable to fetch dashboard intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardState();
  }, [cadreId]);

  const officerName =
    user?.fullName &&
    (user.fullName.toLowerCase().includes("sanvi") ||
      user.fullName.toLowerCase().includes("siya") ||
      user.fullName.toLowerCase().includes("keiyona"))
      ? i18n.language === "hi"
        ? "सान्वी सावंत"
        : i18n.language === "mr"
        ? "सान्वी सावंत"
        : user.fullName
      : user?.fullName || "Sanvi Sawant";

  const officerDesignation = user?.designation || "Senior Statistical Officer (ISS)";

  // Derived metrics
  const recommendations = flowData?.recommendations || [];
  const level = questData?.level || 4;
  const xp = questData?.xp || 720;

  const handleCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (copilotQuery.trim()) {
      navigate("/ai-assistant", { state: { query: copilotQuery.trim() } });
    }
  };

  const handlePromptChipClick = (prompt: string) => {
    navigate("/ai-assistant", { state: { query: prompt } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dashboard Header: Modern Title & Direct CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {officerName.split(" ")[0]}
            </h1>
            <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-200/60 inline-flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              MoSPI Official Cadre
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {officerDesignation} • Field Operations Division, Central Cadre
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link to="/assessment">
            <button
              type="button"
              className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5 text-slate-600" />
              <span>Start Diagnostic</span>
            </button>
          </Link>

          <Link to="/ai-assistant">
            <button
              type="button"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Consult DakshaAI</span>
            </button>
          </Link>
        </div>
      </div>

      {fetchError && (
        <ErrorState
          compact
          message={fetchError}
          onRetry={fetchDashboardState}
        />
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <MetricSkeleton key={n} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <CardSkeleton lines={5} />
            </div>
            <div className="lg:col-span-4">
              <CardSkeleton lines={4} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Metrics Row (4-Column KPI Strip with Distinct EdTech Palettes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Overall Competency Score (Emerald Accent) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-sm transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <span>Overall Competency Score</span>
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-900 tracking-tight">
                    3.4 <span className="text-sm font-normal text-slate-400">/ 5.0</span>
                  </div>
                </div>

                {/* Circular SVG Progress Ring (68%) */}
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      className="stroke-slate-100"
                      strokeWidth="3.5"
                      fill="none"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      className="stroke-emerald-500 transition-all duration-1000"
                      strokeWidth="3.5"
                      strokeDasharray="113.1"
                      strokeDashoffset="36.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute text-[11px] font-black text-slate-800">
                    68%
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200/60 text-[11px]">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  +0.4 this quarter
                </span>
                <span className="text-slate-400 font-medium">
                  Target: 4.0 Standard
                </span>
              </div>
            </div>

            {/* KPI 2: Active Pathways (Violet Accent) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-sm transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    Active Pathways
                  </span>
                  <div className="mt-2 text-3xl font-black text-slate-900 tracking-tight flex items-baseline">
                    {recommendations.length > 0 ? recommendations.length : 1} <span className="text-sm font-normal text-slate-500 ml-1.5">Enrolled</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                <span className="font-semibold text-slate-700">Sampling Specialist</span>
                <span className="font-mono text-violet-700 font-bold text-[11px]">On Track</span>
              </div>
            </div>

            {/* KPI 3: Cadre Progression (Indigo/Blue Accent) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-sm transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    Cadre Progression
                  </span>
                  <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                    Level {level} Officer
                  </div>
                </div>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                  Rank #14
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">{xp} / 1,000 XP</span>
                  <span className="text-indigo-600 font-bold text-[11px]">Tier L5 Next</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full w-[72%] transition-all duration-500" />
                </div>
              </div>
            </div>

            {/* KPI 4: Benchmark Percentile (Amber Accent) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between hover:shadow-sm transition-all hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500">
                    Benchmark Percentile
                  </span>
                  <div className="mt-2 text-3xl font-extrabold text-amber-600 tracking-tight">
                    Top 12%
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Outperforming FOD cadre baseline</span>
              </div>
            </div>
          </div>

          {/* Main Body: 2-Column Responsive Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (65% width: lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Personalized Training Pathway */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6H6a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3Z" />
                        <path d="M9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                        <path d="M15 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Personalized Training Pathway
                      </h2>
                      <p className="text-xs text-slate-500">
                        Aligned with National Statistical Training Framework
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-200/60">
                      iGOT Karmayogi Linked
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200">
                      Milestone: 15 Mar
                    </span>
                  </div>
                </div>

                {/* Sub-card Container */}
                <div className="bg-indigo-50/40 border border-indigo-100/80 rounded-2xl p-5 sm:p-6 mt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        MODULE 4 OF 6
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        Core Methodological Competency
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>⏱ 1h 45m remaining</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Sampling Design & Survey Multipliers for NSS Rounds
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Advanced Stratified Multi-Stage Sampling, Frame Normalization, and Post-Stratification Estimation
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Overall Module Completion</span>
                      <span className="font-bold text-indigo-600">68%</span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-indigo-600 h-2.5 rounded-full w-[68%] transition-all duration-500" />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-medium text-slate-500 mr-2 block sm:inline mb-1">
                      Competencies Covered:
                    </span>
                    <div className="inline-flex flex-wrap gap-1.5">
                      <span className="bg-white border border-slate-200 text-slate-700 text-xs font-mono px-2.5 py-1 rounded-md shadow-2xs">
                        Inverse Probability Weighting
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-700 text-xs font-mono px-2.5 py-1 rounded-md shadow-2xs">
                        Non-Sampling Error Audit
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-700 text-xs font-mono px-2.5 py-1 rounded-md shadow-2xs">
                        R-Script Multipliers
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Link to="/igot-learning">
                      <button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-600/20 hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume Learning →</span>
                      </button>
                    </Link>

                    <Link
                      to="/learning"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                      <span>View Full Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Card 2: Competency Diagnostic Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      Competency Diagnostic Breakdown
                    </h2>
                    <p className="text-xs text-slate-500">
                      Cadre-level assessments benchmarked against MoSPI Directorate Standards
                    </p>
                  </div>
                </div>

                {/* Target Benchmark Guide Indicator */}
                <div className="mt-3">
                  <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-200/60 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    Target Benchmark: Level 4.0
                  </span>
                </div>

                {/* Diagnostic Skills Rows */}
                <div className="mt-5 space-y-4">
                  {/* Skill 1 */}
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Survey Sampling & Estimation
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Exceeds Target
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">4.2 / 5.0</span>
                        <Link to="/competency" className="text-xs font-semibold text-blue-600 hover:underline">
                          Details
                        </Link>
                      </div>
                    </div>
                    {/* Progress Bar with Benchmark Marker */}
                    <div className="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                      <div className="bg-emerald-500 h-2 rounded-full w-[84%]" />
                      <div
                        className="absolute top-0 bottom-0 left-[80%] w-[2px] bg-slate-400 z-10"
                        title="Target Benchmark: 4.0"
                      />
                    </div>
                  </div>

                  {/* Skill 2 */}
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Price Statistics & CPI Indexing
                        </span>
                        <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Moderate Gap
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">3.1 / 5.0</span>
                        <Link to="/competency" className="text-xs font-semibold text-blue-600 hover:underline">
                          View Gap
                        </Link>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                      <div className="bg-blue-600 h-2 rounded-full w-[62%]" />
                      <div
                        className="absolute top-0 bottom-0 left-[80%] w-[2px] bg-slate-400 z-10"
                        title="Target Benchmark: 4.0"
                      />
                    </div>
                  </div>

                  {/* Skill 3 */}
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Periodic Labour Force Survey (PLFS) Diagnostics
                        </span>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          In Progress
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">3.5 / 5.0</span>
                        <Link to="/assessment" className="text-xs font-semibold text-blue-600 hover:underline">
                          Practice
                        </Link>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                      <div className="bg-blue-600 h-2 rounded-full w-[70%]" />
                      <div
                        className="absolute top-0 bottom-0 left-[80%] w-[2px] bg-slate-400 z-10"
                        title="Target Benchmark: 4.0"
                      />
                    </div>
                  </div>

                  {/* Skill 4 */}
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          AI-Assisted Field Data Validation
                        </span>
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Recommended for Training
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">2.8 / 5.0</span>
                        <Link to="/igot-learning" className="text-xs font-semibold text-blue-600 hover:underline">
                          Start Module
                        </Link>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                      <div className="bg-purple-600 h-2 rounded-full w-[56%]" />
                      <div
                        className="absolute top-0 bottom-0 left-[80%] w-[2px] bg-slate-400 z-10"
                        title="Target Benchmark: 4.0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (35% width: lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Card 1: Active Assessment Card */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-slate-700" />
                    <h2 className="font-bold text-slate-900 text-sm">
                      Active Assessment
                    </h2>
                  </div>
                  <span className="bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Action Required
                  </span>
                </div>

                {/* Inner Assessment Box */}
                <div className="bg-blue-50/40 border border-blue-100/60 rounded-xl p-4 mt-3 space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Quarterly Field Competency Check
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Covers Household Schedule 10.1 canvassing nuances and imputation handling.
                  </p>

                  <div className="space-y-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>5 Multi-choice questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>10 minutes allocated</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-600 font-semibold">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Deadline: Tomorrow, 5:00 PM IST</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-blue-100/60">
                      <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                        +150 Cadre XP
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Auto-certified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <Link to="/assessment" className="block mt-3">
                  <button
                    type="button"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Start Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>

                {/* Queued Assessment Item Preview */}
                <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      ASI Annual Survey Review
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Scheduled: 20 Mar 2025
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                    Queued
                  </span>
                </div>
              </div>

              {/* Card 2: DakshaAI Copilot Widget */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden">
                {/* Accent Top Gradient Line */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-rose-400 absolute top-0 left-0" />

                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h2 className="font-bold text-slate-900 text-sm">
                      DakshaAI Copilot
                    </h2>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 font-mono">
                    MoSPI LLM v2
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Instant guidance on official manuals, statistical standards, and stratified methodology.
                </p>

                {/* Starter Prompts */}
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => handlePromptChipClick("Summarize NSS 78th Round Manual")}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-xs font-medium text-slate-700 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <span className="truncate">"Summarize NSS 78th Round Manual"</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePromptChipClick("Explain Multiplier Estimation for stratified survey designs")}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200/70 text-xs font-medium text-slate-700 flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <span className="truncate">"Explain Multiplier Estimation for..."</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </button>
                </div>

                {/* Query Input Field */}
                <form onSubmit={handleCopilotSubmit} className="relative mt-3.5">
                  <input
                    type="text"
                    value={copilotQuery}
                    onChange={(e) => setCopilotQuery(e.target.value)}
                    placeholder="Ask DakshaAI statistical query..."
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    aria-label="Submit query to DakshaAI"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};


// Portal Notices View with Full i18n Translation
const NoticesView = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs">
        <h2 className="text-xl font-bold text-slate-900">{t("modules.notices.title")}</h2>
        <p className="text-xs text-slate-500 mt-1">{t("modules.notices.desc")}</p>
      </div>
      <div className="space-y-3">
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {t("modules.notices.item1_title")}
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              {t("modules.notices.item1_desc")}
            </p>
            <span className="text-[11px] text-slate-400 mt-2 block">
              {t("modules.notices.item1_issued")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root route redirects to /login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Government Portal Application Shell */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/journey" element={<JourneyView />} />
            <Route path="/my-journey" element={<Navigate to="/journey" replace />} />
            <Route path="/competency" element={<CompetencyView />} />
            <Route path="/competencies" element={<Navigate to="/competency" replace />} />
            <Route path="/learning" element={<LearningView />} />
            <Route path="/igot-learning" element={<IGOTLearning />} />
            <Route path="/recommendations" element={<Navigate to="/igot-learning" replace />} />
            <Route path="/assessment" element={<AssessmentView />} />
            <Route path="/quizzes" element={<Navigate to="/assessment" replace />} />
            <Route path="/ai-assistant" element={<AIAssistantView />} />
            <Route
              path="/quest"
              element={
                <RoleProtectedRoute allowedRoles={["learner"]}>
                  <QuestView />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                  <AnalyticsView />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/trainer/questions"
              element={
                <RoleProtectedRoute allowedRoles={["trainer", "admin"]}>
                  <TrainerQuestionBankView />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                  <AdminUserManagementView />
                </RoleProtectedRoute>
              }
            />
            <Route path="/notices" element={<NoticesView />} />
          </Route>

          {/* Catch-all fallback route redirects to /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
