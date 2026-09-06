import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import "./i18n/config";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./features/auth/Login";
import { Signup } from "./features/auth/Signup";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "./components/common/Card";
import { Button } from "./components/common/Button";
import {
  Award,
  BookOpen,
  TrendingUp,
  Target,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  BarChart3,
  Bot,
  AlertTriangle,
} from "lucide-react";

// Real Unified Feature Views
import CompetencyView from "./features/competency/CompetencyView";
import LearningView from "./features/learning/LearningView";
import AIAssistantView from "./features/assistant/AIAssistantView";
import AssessmentView from "./features/assessment/AssessmentView";
import AnalyticsView from "./features/analytics/AnalyticsView";
import QuestView from "./features/quest/QuestView";
import IGOTLearning from "./features/igot/IGOTLearning";

import { ErrorState } from "./components/common/ErrorState";
import { MetricSkeleton, CardSkeleton } from "./components/common/SkeletonLoader";

import {
  api,
  type ConnectedLearnerFlowResponse,
  type QuestHomeData,
} from "./services/api";

// Official Government Learner Dashboard View connected to Real Backend
const DashboardView = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";

  const [flowData, setFlowData] = useState<ConnectedLearnerFlowResponse | null>(null);
  const [questData, setQuestData] = useState<QuestHomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    user?.fullName && user.fullName.toLowerCase().includes("keiyona")
      ? (i18n.language === "hi" ? "केयोना रोड्रिग्स" : i18n.language === "mr" ? "केयोना रॉड्रिग्ज" : user.fullName)
      : user?.fullName || "Keiyona Rodrigues";

  const officerDesignation = user?.designation || "Senior Statistical Officer (ISS)";

  // Derived real data
  const totalGaps = flowData?.total_competency_gaps ?? 33;
  const recommendations = flowData?.recommendations || [];
  const level = questData?.level || 7;
  const xp = questData?.xp || 720;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Officer Welcome & Authority Hero Banner (Compact & Commanding) */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-xl p-4 sm:p-6 text-white shadow-sm relative overflow-hidden border border-blue-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{t("dashboard.hero_tag")}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {t("dashboard.welcome_title", { name: officerName })}
            </h1>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              {t("dashboard.welcome_subtitle", {
                designation: officerDesignation,
                cadreId: user?.cadreId || "8921",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to="/assessment">
              <Button variant="saffron" size="sm" leftIcon={<Target className="w-3.5 h-3.5" />}>
                {t("dashboard.gap_diagnostic_btn")}
              </Button>
            </Link>
            <Link to="/ai-assistant">
              <Button variant="secondary" size="sm" leftIcon={<Bot className="w-3.5 h-3.5" />}>
                {t("dashboard.consult_bot_btn")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {fetchError && (
        <ErrorState
          compact
          message={fetchError}
          onRetry={fetchDashboardState}
        />
      )}

      {/* KPI Stats Grid & Main Content */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((n) => (
              <MetricSkeleton key={n} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CardSkeleton lines={4} />
            </div>
            <div>
              <CardSkeleton lines={3} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Competency Score */}
            <Card variant="accent" className="hover:shadow-md transition-shadow">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {t("dashboard.kpi_competency_score")}
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                      3.4 <span className="text-xs font-medium text-slate-400">/ 5.0</span>
                    </h3>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-900 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>{totalGaps} FRAC Competency Gaps</span>
                </div>
              </CardBody>
            </Card>

        {/* KPI 2: Active Pathways */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t("dashboard.kpi_active_pathways")}
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  {recommendations.length > 0 ? recommendations.length : 3}
                </h3>
              </div>
              <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 shrink-0 text-teal-600" />
              <span>iGOT Adaptive Curriculum</span>
            </div>
          </CardBody>
        </Card>

        {/* KPI 3: Cadre Rank & Level */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Cadre Rank & Level
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                  Lvl {level} <span className="text-xs font-normal text-slate-400">({xp} XP)</span>
                </h3>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>Ranked Top 12% in Cadre</span>
            </div>
          </CardBody>
        </Card>

        {/* KPI 4: APAR Readiness */}
        <Card variant="default" className="hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t("dashboard.kpi_cadre_rank")}
                </p>
                <h3 className="text-2xl font-black text-blue-900 mt-0.5">
                  {t("dashboard.kpi_cadre_rank_val")}
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-blue-900 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-blue-700" />
              <span>{t("dashboard.kpi_cadre_rank_sub")}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Grid: Assigned Pathways & Pending Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned FRAC Pathways */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">Personalized FRAC Training Pathways</CardTitle>
                <CardDescription>
                  Dynamically mapped from your P1 competency gaps to the national iGOT catalog
                </CardDescription>
              </div>
              <Link to="/igot-learning" className="text-xs text-blue-900 font-semibold hover:underline flex items-center gap-1">
                {t("dashboard.view_all")} <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardBody className="space-y-4">
              {recommendations.length > 0 ? (
                recommendations.slice(0, 3).map((rec, idx) => (
                  <div
                    key={rec.course_id || idx}
                    className="p-4 border border-slate-200 rounded-xl hover:border-blue-900/40 transition-colors bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-900">
                            {rec.provider || "iGOT Karmayogi"}
                          </span>
                          <span className="text-xs text-slate-500">
                            Matches: {rec.matched_competencies?.join(", ") || "Statistical Competency"}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {rec.title}
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-blue-900 shrink-0">
                        {rec.match_percentage.toFixed(0)}% Fit
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                      <div className="bg-blue-900 h-2 rounded-full" style={{ width: `${Math.max(25, rec.match_percentage)}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Default Pathways */}
                  <div className="p-4 border border-slate-200 rounded-xl hover:border-blue-900/40 transition-colors bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-900">
                            {t("dashboard.pathway1_badge")}
                          </span>
                          <span className="text-xs text-slate-500">
                            {t("dashboard.pathway1_meta")}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {t("dashboard.pathway1_title")}
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-blue-900 shrink-0">
                        75% Progress
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                      <div className="bg-blue-900 h-2 rounded-full" style={{ width: "75%" }} />
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-xl hover:border-blue-900/40 transition-colors bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-100 text-teal-900">
                            {t("dashboard.pathway2_badge")}
                          </span>
                          <span className="text-xs text-slate-500">
                            {t("dashboard.pathway2_meta")}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 text-sm">
                          {t("dashboard.pathway2_title")}
                        </h4>
                      </div>
                      <span className="text-xs font-bold text-teal-700 shrink-0">
                        40% Progress
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                      <div className="bg-teal-700 h-2 rounded-full" style={{ width: "40%" }} />
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Pending Assessments Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">{t("dashboard.pending_assessments_title")}</CardTitle>
                <CardDescription>{t("dashboard.pending_assessments_subtitle")}</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {/* Test 1 */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-red-800 bg-red-100 px-1.5 py-0.5 rounded">
                    High Priority
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    5 MCQs • 10 mins
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                  Sampling Design & Non-Sampling Error Diagnostic
                </h5>
                <Link to="/assessment" className="inline-block mt-2">
                  <Button variant="danger" size="sm">
                    {t("dashboard.start_test")}
                  </Button>
                </Link>
              </div>

              {/* Test 2 */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    3 MCQs • 5 mins
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                  National Accounts & GDP Compilation Concepts
                </h5>
                <Link to="/assessment" className="inline-block mt-2">
                  <Button variant="outline" size="sm">
                    {t("dashboard.review_syllabus")}
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Institutional Compliance Card */}
          <div className="p-4 rounded-xl bg-blue-900 text-white space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <h4 className="text-xs font-bold">{t("dashboard.apar_title")}</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t("dashboard.apar_desc")}
            </p>
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
            <Route path="/competency" element={<CompetencyView />} />
            <Route path="/competencies" element={<Navigate to="/competency" replace />} />
            <Route path="/learning" element={<LearningView />} />
            <Route path="/igot-learning" element={<IGOTLearning />} />
            <Route path="/recommendations" element={<Navigate to="/igot-learning" replace />} />
            <Route path="/assessment" element={<AssessmentView />} />
            <Route path="/quizzes" element={<Navigate to="/assessment" replace />} />
            <Route path="/ai-assistant" element={<AIAssistantView />} />
            <Route path="/quest" element={<QuestView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/notices" element={<NoticesView />} />
          </Route>

          {/* Catch-all fallback route redirects to /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
