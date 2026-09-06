import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  api,
  type SkillGapAnalysisResponse,
  type CompetenciesGroupedResponse,
  type CompetencyDigitalTwinResponse,
  type OfficialProfileOut,
  type ConnectedLearnerFlowResponse,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import {
  Award,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Target,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Layers,
  RotateCcw,
  Brain,
  Sparkles,
  BarChart3,
  Zap,
  Info,
  ArrowUpDown,
  BookOpen,
  Check,
  Calendar,
  UserCheck,
  Activity,
} from "lucide-react";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { MetricSkeleton, CardSkeleton } from "../../components/common/SkeletonLoader";

interface ParsedRationale {
  competencyName: string;
  category?: string;
  whyItMatters: string;
  recommendation: string;
  fullText: string;
}

function parseRationale(rawText: string): ParsedRationale {
  const nameMatch = rawText.match(/'([^']+)'/);
  const competencyName = nameMatch ? nameMatch[1] : "";

  const catMatch = rawText.match(/\[([^\]]+)\]/);
  const category = catMatch ? catMatch[1] : undefined;

  const colonIdx = rawText.indexOf(":");
  const body = colonIdx !== -1 ? rawText.substring(colonIdx + 1).trim() : rawText;

  let whyItMatters = body;
  let recommendation = "";

  const recKeyword = "an immediate deployment";
  const recIndex = body.toLowerCase().indexOf(recKeyword);
  if (recIndex !== -1) {
    whyItMatters = body.substring(0, recIndex).trim();
    recommendation = body.substring(recIndex).trim();
  } else if (body.toLowerCase().includes("recommend")) {
    const sentences = body.split(/(?<=[.!?])\s+/);
    const recSentences = sentences.filter((s) => s.toLowerCase().includes("recommend"));
    const whySentences = sentences.filter((s) => !s.toLowerCase().includes("recommend"));
    if (recSentences.length > 0) {
      recommendation = recSentences.join(" ").trim();
      whyItMatters = whySentences.join(" ").trim();
    }
  }

  if (!recommendation) {
    recommendation = "Targeted enrolment in MoSPI specialized competency development modules and paired on-job mentorship is strongly recommended.";
  }

  return {
    competencyName,
    category,
    whyItMatters: whyItMatters || body,
    recommendation,
    fullText: rawText,
  };
}

export const CompetencyView: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gapData, setGapData] = useState<SkillGapAnalysisResponse | null>(null);
  const [groupedComp, setGroupedComp] = useState<CompetenciesGroupedResponse | null>(null);
  const [digitalTwin, setDigitalTwin] = useState<CompetencyDigitalTwinResponse | null>(null);
  const [profile, setProfile] = useState<OfficialProfileOut | null>(null);
  const [learnerFlow, setLearnerFlow] = useState<ConnectedLearnerFlowResponse | null>(null);

  // Filters & Sorting
  const [selectedDomain, setSelectedDomain] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [sortBy, setSortBy] = useState<"highest_gap" | "lowest_score" | "highest_confidence">("highest_gap");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let resolvedId = "2b574d66-f752-4348-ab00-17587012f291";

      try {
        const flow = await api.getConnectedLearnerFlow(cadreId);
        setLearnerFlow(flow);
        const identity = flow?.identity as any;
        if (identity?.p1_official_id || identity?.p1_user_id || identity?.canonical_user_id || identity?.canonical_id) {
          resolvedId = identity.p1_official_id || identity.p1_user_id || identity.canonical_user_id || identity.canonical_id;
        }
      } catch (err) {
        console.warn("Learner flow fetch non-fatal fallback:", err);
      }

      const [gapsRes, twinRes, profileRes, compRes] = await Promise.allSettled([
        api.getSkillGaps(resolvedId),
        api.getDigitalTwin(resolvedId),
        api.getProfile(resolvedId),
        api.getCompetencies(),
      ]);

      if (gapsRes.status === "fulfilled") setGapData(gapsRes.value);
      if (twinRes.status === "fulfilled") setDigitalTwin(twinRes.value);
      if (profileRes.status === "fulfilled") setProfile(profileRes.value);
      if (compRes.status === "fulfilled") setGroupedComp(compRes.value);

      if (gapsRes.status === "rejected" && twinRes.status === "rejected") {
        setError("Unable to connect to Competency Intelligence service. Please ensure the backend is active.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred while loading competencies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cadreId]);

  // Confidence Lookup Map
  const confidenceMap = useMemo(() => {
    const map = new Map<number, number>();
    if (profile?.scores) {
      profile.scores.forEach((s) => {
        if (s.competency_id != null && s.confidence_weight != null) {
          map.set(s.competency_id, s.confidence_weight);
        }
      });
    }
    return map;
  }, [profile]);

  // Average confidence
  const avgConfidence = useMemo(() => {
    if (!profile?.scores || profile.scores.length === 0) return 82;
    const sum = profile.scores.reduce((acc, s) => acc + (s.confidence_weight || 0.8), 0);
    return Math.round((sum / profile.scores.length) * 100);
  }, [profile]);

  // Parsed Rationales Map
  const rationalesMap = useMemo(() => {
    const map = new Map<string, ParsedRationale>();
    const list = gapData?.critical_gaps_rationale || [];
    list.forEach((r) => {
      const parsed = parseRationale(r);
      if (parsed.competencyName) {
        map.set(parsed.competencyName.toLowerCase(), parsed);
      }
    });
    return map;
  }, [gapData]);

  // Critical Priority Gaps
  const criticalItems = useMemo(() => {
    const rawGaps = gapData?.gaps || [];
    const highGaps = rawGaps.filter((g) => g.priority === "HIGH" || g.gap >= 1.5);
    if (highGaps.length > 0) return highGaps;

    // If no gap >= 1.5, backend selected top critical gaps for rationales
    const list = gapData?.critical_gaps_rationale || [];
    const parsedRationales = list.map(parseRationale);
    const matched = rawGaps.filter((g) =>
      parsedRationales.some((pr) => pr.competencyName.toLowerCase() === g.competency_name.toLowerCase())
    );

    if (matched.length > 0) return matched;
    return rawGaps.filter((g) => g.gap > 0).slice(0, 3);
  }, [gapData]);

  // Domain Statistics
  const domainStats = useMemo(() => {
    const domains = [
      { key: "Statistical", label: t("competency.domain_statistical", "Statistical"), expectedCount: 10, icon: BarChart3 },
      { key: "Technical", label: t("competency.domain_technical", "Technical"), expectedCount: 12, icon: Zap },
      { key: "Digital Governance", label: t("competency.domain_governance", "Digital Governance"), expectedCount: 5, icon: ShieldCheck },
      { key: "Behavioural & Managerial", label: t("competency.domain_behavioural", "Behavioural & Managerial"), expectedCount: 6, icon: Target },
    ];

    return domains.map((d) => {
      const twinCat = digitalTwin?.category_breakdown?.find(
        (c) => c.category.toLowerCase() === d.key.toLowerCase()
      );

      const domainGaps = (gapData?.gaps || []).filter(
        (g) => (g.category || "").toLowerCase() === d.key.toLowerCase()
      );

      const count = domainGaps.length || twinCat?.competencies_count || d.expectedCount;
      const currentAvg =
        twinCat?.current_average ??
        (domainGaps.length > 0
          ? domainGaps.reduce((acc, g) => acc + (g.current_score || 0), 0) / domainGaps.length
          : 3.0);
      const reqAvg =
        twinCat?.required_average ??
        (domainGaps.length > 0
          ? domainGaps.reduce((acc, g) => acc + (g.benchmark_score ?? g.required_score ?? 3.5), 0) / domainGaps.length
          : 3.5);
      const readiness =
        twinCat?.readiness_pct ?? Math.min(100, Math.round((currentAvg / (reqAvg || 3.5)) * 100));

      const highCount = domainGaps.filter((g) => g.priority === "HIGH" || g.gap >= 1.5).length;
      const medCount = domainGaps.filter((g) => g.priority === "MEDIUM" || (g.gap >= 0.5 && g.gap < 1.5)).length;
      const lowCount = domainGaps.filter((g) => g.priority === "LOW" || g.gap < 0.5).length;

      return {
        ...d,
        count,
        currentAvg: Number(currentAvg).toFixed(1),
        reqAvg: Number(reqAvg).toFixed(1),
        readiness: Math.round(readiness),
        highCount,
        medCount,
        lowCount,
      };
    });
  }, [digitalTwin, gapData, t]);

  // Filtered & Sorted Gaps for the Matrix
  const filteredAndSortedGaps = useMemo(() => {
    let list = [...(gapData?.gaps || [])];

    // Domain filter
    if (selectedDomain !== "ALL") {
      list = list.filter(
        (g) => (g.category || "").toLowerCase() === selectedDomain.toLowerCase()
      );
    }

    // Severity filter
    if (selectedSeverity === "HIGH") {
      list = list.filter((g) => g.priority === "HIGH" || g.gap >= 1.5);
    } else if (selectedSeverity === "MEDIUM") {
      list = list.filter((g) => g.priority === "MEDIUM" || (g.gap >= 0.5 && g.gap < 1.5));
    } else if (selectedSeverity === "LOW") {
      list = list.filter((g) => g.priority === "LOW" || g.gap < 0.5);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "highest_gap") {
        return (b.gap || 0) - (a.gap || 0);
      }
      if (sortBy === "lowest_score") {
        return (a.current_score || 0) - (b.current_score || 0);
      }
      if (sortBy === "highest_confidence") {
        const confA = confidenceMap.get(a.competency_id) ?? 0.8;
        const confB = confidenceMap.get(b.competency_id) ?? 0.8;
        return confB - confA;
      }
      return 0;
    });

    return list;
  }, [gapData, selectedDomain, selectedSeverity, sortBy, confidenceMap]);

  // Meta details for header
  const officialName = user?.fullName || profile?.full_name || gapData?.full_name || "Sanvi Sawant";
  const officialRole = user?.designation || profile?.designation || gapData?.job_role || "Senior Statistical Officer (ISS)";
  const statusSummary = digitalTwin?.status_summary || (
    (gapData?.high_priority_count || 0) > 0
      ? t("competency.status_attention", "Action Required (Critical Gaps)")
      : t("competency.status_proficient", "Operationally Proficient")
  );

  const lastUpdatedFormatted = useMemo(() => {
    const raw = profile?.scores?.[0]?.last_updated || profile?.created_at;
    if (raw) {
      try {
        const d = new Date(raw);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      } catch {
        return "Recent";
      }
    }
    return "Recent";
  }, [profile]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── 1. HEADER / HERO SECTION ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-xl p-5 sm:p-6 text-white shadow-sm border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/40 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Brain className="w-3.5 h-3.5 text-blue-300" />
              <span>{t("competency.badge", "P1 Competency Intelligence & Digital Twin")}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t("competency.header_title", "AI Competency Diagnostic")}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              {t(
                "competency.header_subtitle",
                "AI-calibrated view of your current capabilities against the competency benchmarks for your role."
              )}
            </p>

            {/* Officer Meta Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300 border-t border-slate-800/80 mt-3">
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
                <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-slate-400">{t("competency.officer_name_label", "Officer")}:</span>
                <span className="font-semibold text-white">{officialName}</span>
                <span className="text-slate-500 font-mono">({cadreId})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400">{t("competency.role_label", "Role")}:</span>
                <span className="font-semibold text-slate-200">{officialRole}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">{t("competency.status_label", "Status")}:</span>
                <span className="font-semibold text-amber-300">{statusSummary}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
                <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                <span className="text-slate-400">{t("competency.last_updated_label", "Last Calibration")}:</span>
                <span className="text-slate-200">{lastUpdatedFormatted}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-row flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <Button
              variant="outlineInvert"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            >
              {t("competency.refresh", "Refresh Diagnostic")}
            </Button>
            <Link to="/assessment">
              <Button variant="saffron" size="sm" leftIcon={<Target className="w-3.5 h-3.5" />}>
                {t("competency.start_diagnostic", "Start Diagnostic Test")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && !loading && (
        <ErrorState
          compact={Boolean(gapData || groupedComp)}
          title="Competency Intelligence Notice"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <MetricSkeleton key={n} />
            ))}
          </div>
          <CardSkeleton lines={6} />
          <CardSkeleton lines={4} />
        </div>
      ) : !gapData && !groupedComp && error ? (
        <ErrorState
          title="Unable to Load Competency Framework"
          message="Could not connect to the P1 Competency Intelligence service. Please verify backend availability."
          onRetry={loadData}
        />
      ) : (
        <>
          {/* ── 2. AI DIAGNOSTIC SUMMARY CARDS ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Overall Readiness */}
            <Card variant="accent" className="border-l-4 border-l-blue-900 shadow-xs">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t("competency.kpi_overall_score", "Overall Readiness")}
                  </p>
                  <ShieldCheck className="w-4 h-4 text-blue-900" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {digitalTwin?.overall_readiness_pct
                    ? `${digitalTwin.overall_readiness_pct}%`
                    : `${((5.0 - (gapData?.average_gap || 0.5)) / 5.0 * 100).toFixed(1)}%`}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t("competency.kpi_overall_sub", "Cadre Benchmark Alignment")}
                </p>
              </CardBody>
            </Card>

            {/* High Priority Gaps */}
            <Card className="border-l-4 border-l-red-600 shadow-xs">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t("competency.kpi_high_gaps", "High Priority Gaps")}
                  </p>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-red-600 mt-1">
                  {gapData?.high_priority_count ?? 0}
                </h3>
                <p className="text-[11px] text-red-700 mt-1 flex items-center gap-1 font-medium">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  {t("competency.kpi_high_gaps_sub", "Gap ≥ 1.5 Benchmark Deficit")}
                </p>
              </CardBody>
            </Card>

            {/* Medium Priority Gaps */}
            <Card className="border-l-4 border-l-amber-500 shadow-xs">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t("competency.kpi_med_gaps", "Medium Priority Gaps")}
                  </p>
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-2xl font-black text-amber-600 mt-1">
                  {gapData?.medium_priority_count ?? 0}
                </h3>
                <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                  <Target className="w-3.5 h-3.5 text-amber-500" />
                  {t("competency.kpi_med_gaps_sub", "0.5 ≤ Gap < 1.5")}
                </p>
              </CardBody>
            </Card>

            {/* Proficient / Low Gaps */}
            <Card className="border-l-4 border-l-teal-600 shadow-xs">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t("competency.kpi_low_gaps", "Proficient / Low Gaps")}
                  </p>
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                </div>
                <h3 className="text-2xl font-black text-teal-700 mt-1">
                  {gapData?.low_priority_count ?? 0}
                </h3>
                <p className="text-[11px] text-teal-700 mt-1 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5 text-teal-500" />
                  {t("competency.kpi_low_gaps_sub", "Gap < 0.5 (On Target)")}
                </p>
              </CardBody>
            </Card>

            {/* AI Calibration Confidence */}
            <Card className="border-l-4 border-l-indigo-600 shadow-xs">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t("competency.kpi_confidence", "AI Confidence")}
                  </p>
                  <Brain className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-black text-indigo-900 mt-1">
                  {avgConfidence}%
                </h3>
                <p
                  className="text-[11px] text-indigo-800 mt-1 flex items-center gap-1 font-medium cursor-help"
                  title={t(
                    "competency.confidence_tooltip",
                    "Represents statistical confidence in the calibration based on verifiable profile evidence and assessment records, not the officer's proficiency score."
                  )}
                >
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">{t("competency.kpi_confidence_sub", "Evidence & Profile Weights")}</span>
                </p>
              </CardBody>
            </Card>
          </div>

          {/* ── 3. CRITICAL GAPS — MOST IMPORTANT SECTION ───────────────────────── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  {t("competency.critical_gaps_title", "Critical Priority Skill Gaps")}
                </h2>
                <p className="text-xs text-slate-500">
                  {t(
                    "competency.critical_gaps_desc",
                    "High-priority capability deficits flagged by the AI engine requiring accelerated remediation."
                  )}
                </p>
              </div>
              <Link to="/igot-learning">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {t("competency.view_learning_recommendations", "View Learning Recommendations")}
                </Button>
              </Link>
            </div>

            {criticalItems.length === 0 ? (
              <Card className="border-dashed border-slate-300 bg-slate-50/50">
                <CardBody className="p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">
                    {t("competency.no_critical_gaps_title", "No Critical Gaps Detected")}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                    {t(
                      "competency.no_critical_gaps_desc",
                      "All evaluated competencies currently satisfy or closely track required role baseline benchmarks."
                    )}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criticalItems.map((item, idx) => {
                  const current = item.current_score || 2.4;
                  const benchmark = item.benchmark_score ?? item.required_score ?? 3.5;
                  const gap = item.gap ?? Math.max(0, benchmark - current);
                  const confidence = confidenceMap.get(item.competency_id) ?? 0.8;
                  const confidencePct = Math.round(confidence * 100);

                  const parsed = rationalesMap.get(item.competency_name.toLowerCase()) || {
                    competencyName: item.competency_name,
                    category: item.category,
                    whyItMatters: `Calibrated officer score (${current.toFixed(1)}) is lower than mandatory role benchmark (${benchmark.toFixed(1)}) mandated by MoSPI cadre framework.`,
                    recommendation: `Deployment to specialized '${item.competency_name} Immersion Workshop' or paired on-job mentorship is recommended.`,
                    fullText: "",
                  };

                  // Check if learnerFlow has matched course recommendations
                  const matchedCourse = learnerFlow?.recommendations?.find(
                    (r) =>
                      r.matched_competencies?.some(
                        (mc) => mc.toLowerCase() === item.competency_name.toLowerCase()
                      ) ||
                      (r as any).competency_name?.toLowerCase() === item.competency_name.toLowerCase()
                  );

                  const currentPct = Math.min(100, (current / 5.0) * 100);
                  const benchPct = Math.min(100, (benchmark / 5.0) * 100);

                  return (
                    <Card
                      key={item.competency_id || idx}
                      className="border-red-200 hover:border-red-300 shadow-xs transition-all flex flex-col justify-between"
                    >
                      <CardBody className="p-4 space-y-3.5">
                        {/* Card Header & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                                #{item.competency_id}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-900 border border-blue-200">
                                {item.category || "Statistical"}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-black rounded ${
                                  item.priority === "HIGH" || gap >= 1.5
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : "bg-amber-100 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {item.priority || "HIGH"} PRIORITY
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">
                              {item.competency_name}
                            </h3>
                          </div>
                          {/* Confidence Indicator with Tooltip */}
                          <div
                            className="shrink-0 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-semibold flex items-center gap-1 cursor-help"
                            title={t(
                              "competency.confidence_tooltip",
                              "Represents statistical confidence in the calibration based on verifiable profile evidence and assessment records, not the officer's proficiency score."
                            )}
                          >
                            <Brain className="w-3 h-3 text-indigo-600" />
                            <span>{confidencePct}%</span>
                          </div>
                        </div>

                        {/* Scores & Benchmark Row */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-medium block">
                              {t("competency.calibrated_score", "Calibrated")}
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              {current.toFixed(1)} <span className="text-slate-400 text-xs font-normal">/ 5</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-medium block">
                              {t("competency.benchmark", "Benchmark")}
                            </span>
                            <span className="text-sm font-black text-blue-900">
                              {benchmark.toFixed(1)} <span className="text-slate-400 text-xs font-normal">/ 5</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-medium block">
                              {t("competency.gap_delta", "Gap Delta")}
                            </span>
                            <span className="text-sm font-black text-red-600">
                              -{gap.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* Comparative Visual Bar (1–5 scale) */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                            <span>Score: {current.toFixed(1)}/5.0</span>
                            <span>Target: {benchmark.toFixed(1)}/5.0</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 relative overflow-hidden">
                            <div
                              style={{ width: `${currentPct}%` }}
                              className="h-full bg-red-600 rounded-full transition-all duration-500"
                            />
                            <div
                              style={{ left: `${benchPct}%` }}
                              className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10"
                              title={`Target Benchmark: ${benchmark.toFixed(1)}`}
                            />
                          </div>
                        </div>

                        {/* "Why this matters" — AI-generated Rationale */}
                        <div className="bg-red-50/70 border-l-2 border-l-red-500 p-2.5 rounded-r-md space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-red-900">
                            <Sparkles className="w-3.5 h-3.5 text-red-600" />
                            <span>{t("competency.why_this_matters", "Why this matters")}</span>
                          </div>
                          <p className="text-xs text-red-950 leading-relaxed">
                            {parsed.whyItMatters}
                          </p>
                        </div>

                        {/* "Recommended intervention" */}
                        <div className="bg-blue-50/70 border-l-2 border-l-blue-600 p-2.5 rounded-r-md space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-900">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>{t("competency.recommended_intervention", "Recommended intervention")}</span>
                          </div>
                          {matchedCourse ? (
                            <p className="text-xs text-blue-950 leading-relaxed font-semibold">
                              {matchedCourse.title || (matchedCourse as any).course_title} (
                              {matchedCourse.provider || "iGOT Karmayogi"})
                            </p>
                          ) : (
                            <p className="text-xs text-blue-950 leading-relaxed">
                              {parsed.recommendation}
                            </p>
                          )}
                        </div>

                        {/* Action Link to Learning */}
                        <Link to="/igot-learning" className="block pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center"
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          >
                            {t("competency.view_learning_recommendations", "View Learning Recommendations")}
                          </Button>
                        </Link>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 4. DOMAIN DIAGNOSTIC OVERVIEW (4 MoSPI DOMAINS) ──────────────── */}
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-900" />
                {t("competency.domain_overview_title", "Domain Diagnostic Overview")}
              </h2>
              <p className="text-xs text-slate-500">
                {t(
                  "competency.domain_overview_desc",
                  "Holistic competency breakdown across MoSPI statistical, technical, digital governance, and leadership domains."
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {domainStats.map((dom) => {
                const IconComponent = dom.icon;
                const isSelected = selectedDomain.toLowerCase() === dom.key.toLowerCase();

                return (
                  <div
                    key={dom.key}
                    onClick={() => setSelectedDomain(isSelected ? "ALL" : dom.key)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-900 bg-blue-50/40 shadow-xs ring-2 ring-blue-900/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-900/10 text-blue-900">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{dom.label}</h4>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {dom.count} {t("competency.competencies_count", "Competencies")}
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-medium text-slate-400 block">
                          {t("competency.current_proficiency", "Avg Current / Target")}
                        </span>
                        <span className="text-lg font-black text-slate-900">
                          {dom.currentAvg} <span className="text-slate-400 text-xs font-normal">/ {dom.reqAvg}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-medium text-slate-400 block">
                          {t("competency.readiness", "Readiness")}
                        </span>
                        <span className="text-lg font-black text-blue-900">{dom.readiness}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${dom.readiness}%` }}
                        className="h-full bg-blue-900 rounded-full transition-all duration-500"
                      />
                    </div>

                    {/* Gaps Breakdown Pills */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium">
                      <span className="text-red-700 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {dom.highCount} High
                      </span>
                      <span className="text-amber-700 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {dom.medCount} Med
                      </span>
                      <span className="text-teal-700 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                        {dom.lowCount} Proficient
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 5. DETAILED COMPETENCY EVALUATION MATRIX ──────────────────────── */}
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  {t("competency.matrix_title", "Competency Evaluation Matrix")}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {t(
                    "competency.matrix_desc",
                    "Granular 33-competency breakdown with calibrated scores, role benchmarks, and gap deltas."
                  )}
                </CardDescription>
              </div>

              {/* Sorting options */}
              <div className="flex items-center gap-2 text-xs self-start md:self-auto">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  {t("competency.sort_label", "Sort By")}:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-900 cursor-pointer"
                >
                  <option value="highest_gap">{t("competency.sort_highest_gap", "Highest Gap")}</option>
                  <option value="lowest_score">{t("competency.sort_lowest_score", "Lowest Score")}</option>
                  <option value="highest_confidence">{t("competency.sort_highest_confidence", "Highest Confidence")}</option>
                </select>
              </div>
            </CardHeader>

            <CardBody className="space-y-4">
              {/* Filter Toolbars */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                {/* Domain Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">
                    Domain:
                  </span>
                  {[
                    { key: "ALL", label: t("competency.filter_all_domains", "All Domains") },
                    { key: "Statistical", label: t("competency.domain_statistical", "Statistical") },
                    { key: "Technical", label: t("competency.domain_technical", "Technical") },
                    { key: "Digital Governance", label: t("competency.domain_governance", "Digital Governance") },
                    { key: "Behavioural & Managerial", label: t("competency.domain_behavioural", "Behavioural & Managerial") },
                  ].map((dom) => (
                    <button
                      key={dom.key}
                      onClick={() => setSelectedDomain(dom.key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedDomain.toLowerCase() === dom.key.toLowerCase()
                          ? "bg-blue-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {dom.label}
                    </button>
                  ))}
                </div>

                {/* Severity Filter Pills */}
                <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
                  <span className="text-xs font-bold text-slate-400 mr-1">
                    {t("competency.severity", "Severity")}:
                  </span>
                  {[
                    { key: "ALL", label: t("competency.filter_all", "All") },
                    { key: "HIGH", label: t("competency.filter_high", "High Gap") },
                    { key: "MEDIUM", label: t("competency.filter_medium", "Medium Gap") },
                    { key: "LOW", label: t("competency.filter_proficient", "Proficient") },
                  ].map((sev) => (
                    <button
                      key={sev.key}
                      onClick={() => setSelectedSeverity(sev.key as any)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedSeverity === sev.key
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Competency Cards / Rows */}
              {filteredAndSortedGaps.length === 0 ? (
                <EmptyState
                  icon={<Award className="w-6 h-6 text-slate-400" />}
                  title="No Competencies Match Filters"
                  description="Try adjusting your domain or severity filters to view evaluations."
                  actionText="Reset All Filters"
                  actionIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onAction={() => {
                    setSelectedDomain("ALL");
                    setSelectedSeverity("ALL");
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {filteredAndSortedGaps.map((item, idx) => {
                    const current = item.current_score || 3.0;
                    const benchmark = item.benchmark_score ?? item.required_score ?? 3.5;
                    const gap = item.gap ?? Math.max(0, benchmark - current);
                    const confidence = confidenceMap.get(item.competency_id) ?? 0.8;
                    const confidencePct = Math.round(confidence * 100);

                    const currentPct = Math.min(100, (current / 5.0) * 100);
                    const benchPct = Math.min(100, (benchmark / 5.0) * 100);

                    const isHigh = item.priority === "HIGH" || gap >= 1.5;
                    const isMed = item.priority === "MEDIUM" || (gap >= 0.5 && gap < 1.5);

                    return (
                      <div
                        key={item.competency_id || idx}
                        className="p-4 border border-slate-200 rounded-xl hover:border-blue-900/30 transition-all bg-white shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Competency Info */}
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                                #{item.competency_id || idx + 1}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-900 border border-blue-200">
                                {item.category || "Statistical"}
                              </span>

                              {/* Priority Badge with Distinct Icon */}
                              {isHigh ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  HIGH GAP
                                </span>
                              ) : isMed ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  MEDIUM GAP
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                  PROFICIENT
                                </span>
                              )}

                              {/* AI Confidence Indicator with Tooltip */}
                              <span
                                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1 cursor-help"
                                title={t(
                                  "competency.confidence_tooltip",
                                  "Represents statistical confidence in the calibration based on verifiable profile evidence and assessment records, not the officer's proficiency score."
                                )}
                              >
                                <Brain className="w-3 h-3 text-indigo-600" />
                                {confidencePct}% Conf.
                              </span>
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                              {item.competency_name}
                            </h4>
                          </div>

                          {/* Scores & Delta */}
                          <div className="flex items-center gap-3 sm:gap-4 text-xs shrink-0 self-start sm:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                                {t("competency.calibrated_score", "Current / Target")}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">
                                {current.toFixed(1)}{" "}
                                <span className="text-slate-400 font-normal text-xs">/ {benchmark.toFixed(1)}</span>
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block uppercase font-medium">
                                {t("competency.gap_delta", "Gap Delta")}
                              </span>
                              <span
                                className={`font-bold text-sm ${
                                  gap >= 1.5 ? "text-red-600" : gap >= 0.5 ? "text-amber-600" : "text-teal-600"
                                }`}
                              >
                                {gap > 0 ? `-${gap.toFixed(1)}` : "On Target"}
                              </span>
                            </div>

                            <Link to="/igot-learning">
                              <Button variant="outline" size="sm">
                                {t("competency.build_competency", "Build Competency")}
                              </Button>
                            </Link>
                          </div>
                        </div>

                        {/* Comparative Visual Bar (1–5 scale) */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Current Proficiency: {currentPct.toFixed(0)}% (Level {current.toFixed(1)})</span>
                            <span>Role Target Benchmark: {benchPct.toFixed(0)}% (Level {benchmark.toFixed(1)})</span>
                          </div>
                          <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100 relative">
                            <div
                              style={{ width: `${currentPct}%` }}
                              className={`shadow-none flex flex-col justify-center transition-all duration-500 ${
                                isHigh ? "bg-red-500" : isMed ? "bg-amber-500" : "bg-blue-900"
                              }`}
                            />
                            <div
                              style={{ left: `${benchPct}%` }}
                              className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10"
                              title={`Target Benchmark: Level ${benchmark.toFixed(1)}`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Proficiency Scale Legend */}
              <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
                {t(
                  "competency.scale_legend",
                  "Proficiency Scale: 1 (Novice) • 2 (Developing) • 3 (Proficient) • 4 (Advanced) • 5 (Expert)"
                )}
              </div>
            </CardBody>
          </Card>

          {/* ── 6. AI EXPLANATION / XAI METHODOLOGY SECTION ──────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold">
                <Brain className="w-3.5 h-3.5 text-indigo-600" />
                <span>Explainable AI (XAI) Architecture</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {t("competency.xai_title", "How the AI Assessed Your Competencies")}
              </h2>
              <p className="text-xs text-slate-600 max-w-3xl">
                {t(
                  "competency.xai_subtitle",
                  "Explainable AI (XAI) methodology powering official MoSPI competency calibration and gap diagnosis."
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 text-xs font-black flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  {t("competency.xai_step1_title", "Profile Intake")}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {t(
                    "competency.xai_step1_desc",
                    "Official service records, qualifications, prior training history, and self-assessment feed into the baseline calibration engine."
                  )}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  {t("competency.xai_step2_title", "Score Calibration")}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {t(
                    "competency.xai_step2_desc",
                    "Backend AI models evaluate demonstrated capabilities across all 33 canonical MoSPI competencies, generating calibrated scores (1.0–5.0) and confidence weights."
                  )}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 text-xs font-black flex items-center justify-center">
                  3
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  {t("competency.xai_step3_title", "Role Benchmark")}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {t(
                    "competency.xai_step3_desc",
                    "Calibrated proficiencies are mapped against the mandatory role benchmarks defined in the MoSPI FRAC framework for your cadre designation."
                  )}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 text-xs font-black flex items-center justify-center">
                  4
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  {t("competency.xai_step4_title", "Gap Severity")}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {t(
                    "competency.xai_step4_desc",
                    "Deficits are categorized into High (≥1.5), Medium (0.5–1.5), and Low/Proficient (<0.5) to strategically prioritize development needs."
                  )}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 shadow-2xs">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 text-xs font-black flex items-center justify-center">
                  5
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  {t("competency.xai_step5_title", "Rationale & Remediation")}
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {t(
                    "competency.xai_step5_desc",
                    "AI-generated rationales highlight why critical capability deficits matter operationally and pair them with tailored learning interventions."
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px]">
              <Info className="w-4 h-4 text-blue-900 shrink-0" />
              <span>
                {t(
                  "competency.xai_server_note",
                  "Note: All diagnostic evaluations and score calibrations are securely computed by DAKSHA's backend P1 Competency Intelligence & FRAC rules engine."
                )}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompetencyView;
