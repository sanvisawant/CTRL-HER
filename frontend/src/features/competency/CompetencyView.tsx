import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  api,
  type SkillGapAnalysisResponse,
  type CompetenciesGroupedResponse,
  type CompetencyGapContract,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import {
  Award,
  AlertCircle,
  TrendingDown,
  Target,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Layers,
  RotateCcw,
} from "lucide-react";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { MetricSkeleton, CardSkeleton } from "../../components/common/SkeletonLoader";

export const CompetencyView: React.FC = () => {
  const { user } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gapData, setGapData] = useState<SkillGapAnalysisResponse | null>(null);
  const [groupedComp, setGroupedComp] = useState<CompetenciesGroupedResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gapsRes, compRes] = await Promise.allSettled([
        api.getSkillGaps(cadreId),
        api.getCompetencies(),
      ]);

      if (gapsRes.status === "fulfilled") {
        setGapData(gapsRes.value);
      } else {
        console.warn("Failed to load skill gaps:", gapsRes.reason);
      }

      if (compRes.status === "fulfilled") {
        setGroupedComp(compRes.value);
      } else {
        console.warn("Failed to load competencies catalog:", compRes.reason);
      }

      if (gapsRes.status === "rejected" && compRes.status === "rejected") {
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

  const gapsList: CompetencyGapContract[] = gapData?.gaps || [];

  const categories = [
    "ALL",
    ...Array.from(new Set(gapsList.map((g) => g.category || "Statistical"))),
  ];

  const filteredGaps =
    selectedCategory === "ALL"
      ? gapsList
      : gapsList.filter((g) => g.category === selectedCategory);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner (Compact & Dignified) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-blue-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-800/50 border border-blue-400/30 text-blue-200 text-[11px] font-semibold">
            <Award className="w-3.5 h-3.5 text-blue-300" />
            <span>P1 Competency Intelligence & Digital Twin</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            MoSPI Competency Framework & Skill Gap Diagnostic
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            Official benchmark evaluation for {user?.fullName || "Keiyona Rodrigues"} (Cadre: {cadreId}) anchored on the canonical 33 MoSPI statistical competencies.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
            className="border-white/30 text-white hover:bg-white/10"
          >
            Refresh
          </Button>
          <Link to="/assessment">
            <Button variant="saffron" size="sm" leftIcon={<Target className="w-3.5 h-3.5" />}>
              Start Diagnostic Test
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Notice if any */}
      {error && !loading && (
        <ErrorState
          compact={Boolean(gapData || groupedComp)}
          title="Competency Intelligence Notice"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* Loading Skeleton View */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <MetricSkeleton key={n} />
            ))}
          </div>
          <CardSkeleton lines={6} />
        </div>
      ) : !gapData && !groupedComp && error ? (
        <ErrorState
          title="Unable to Load Competency Framework"
          message="Could not connect to the P1 Competency Intelligence service. Please verify backend availability."
          onRetry={loadData}
        />
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="accent">
              <CardBody className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Master Competencies</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {groupedComp?.total_competencies || gapData?.total_competencies || 33}
                </h3>
                <p className="text-xs text-teal-700 mt-2 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Canonical MoSPI Taxonomy
                </p>
              </CardBody>
            </Card>

            <Card variant="default">
              <CardBody className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">High Priority Gaps</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  {gapData?.high_priority_count ?? gapsList.filter((g) => g.priority === "HIGH").length}
                </h3>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Immediate Upskilling Required
                </p>
              </CardBody>
            </Card>

            <Card variant="default">
              <CardBody className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Medium Priority Gaps</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">
                  {gapData?.medium_priority_count ?? gapsList.filter((g) => g.priority === "MEDIUM").length}
                </h3>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" /> Targeted Practice Recommended
                </p>
              </CardBody>
            </Card>

            <Card variant="default">
              <CardBody className="p-4">
                <p className="text-xs font-medium text-slate-500 uppercase">Average Gap Delta</p>
                <h3 className="text-2xl font-bold text-blue-900 mt-1">
                  {gapData?.average_gap ? gapData.average_gap.toFixed(2) : "0.78"} / 5.0
                </h3>
                <p className="text-xs text-blue-800 mt-2 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Role Benchmark Baseline
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0 mr-2">
              <Layers className="w-3.5 h-3.5" /> Domain:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-900 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Competencies & Skill Gaps Table / Card Grid */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">Competency Evaluations & Benchmarks</CardTitle>
                <CardDescription>
                  Displaying {filteredGaps.length} competencies. Evaluated against official Senior Statistical Officer standards.
                </CardDescription>
              </div>
              <Link to="/igot-learning">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View Recommended Pathways
                </Button>
              </Link>
            </CardHeader>
            <CardBody>
              {filteredGaps.length === 0 ? (
                <EmptyState
                  icon={<Award className="w-6 h-6 text-slate-400" />}
                  title="No Competencies Found"
                  description={
                    selectedCategory === "ALL"
                      ? "No competency evaluations are registered yet for this officer profile."
                      : `No competencies registered under the "${selectedCategory}" domain filter.`
                  }
                  actionText={selectedCategory !== "ALL" ? "Reset Domain Filter" : "Start Diagnostic Test"}
                  actionIcon={selectedCategory !== "ALL" ? <RotateCcw className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
                  onAction={
                    selectedCategory !== "ALL"
                      ? () => setSelectedCategory("ALL")
                      : () => window.location.assign("/assessment")
                  }
                />
              ) : (
            <div className="space-y-3">
              {filteredGaps.map((item, idx) => {
                const current = item.current_score || 3.0;
                const benchmark = item.benchmark_score || 4.0;
                const gap = item.gap || Math.max(0, benchmark - current);
                const currentPct = Math.min(100, (current / 5.0) * 100);
                const benchPct = Math.min(100, (benchmark / 5.0) * 100);

                return (
                  <div
                    key={item.competency_id || idx}
                    className="p-4 border border-slate-200 rounded-xl hover:border-blue-900/30 transition-all bg-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                            #{item.competency_id || idx + 1}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-900">
                            {item.category || "Statistical"}
                          </span>
                          {item.is_critical && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800 flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" /> CRITICAL
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              item.priority === "HIGH"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : item.priority === "MEDIUM"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-teal-50 text-teal-700 border border-teal-200"
                            }`}
                          >
                            {item.priority || "MEDIUM"} PRIORITY
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {item.competency_name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-4 text-xs shrink-0">
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">Current / Target</span>
                          <span className="font-bold text-slate-900">
                            {current.toFixed(1)} <span className="text-slate-400 font-normal">/ {benchmark.toFixed(1)}</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">Gap Delta</span>
                          <span className={`font-bold ${gap > 1.0 ? "text-red-600" : gap > 0 ? "text-amber-600" : "text-green-600"}`}>
                            {gap > 0 ? `-${gap.toFixed(1)}` : "Proficient"}
                          </span>
                        </div>
                        <Link to="/assessment">
                          <Button variant="secondary" size="sm">
                            Assess
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Comparative Visual Bar */}
                    <div className="mt-3 relative pt-1">
                      <div className="flex mb-1 items-center justify-between text-[11px] text-slate-500">
                        <span>Current Proficiency: {currentPct.toFixed(0)}%</span>
                        <span>Role Benchmark: {benchPct.toFixed(0)}%</span>
                      </div>
                      <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-100 relative">
                        {/* Current Bar */}
                        <div
                          style={{ width: `${currentPct}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-900 transition-all duration-500"
                        />
                        {/* Benchmark Marker */}
                        <div
                          style={{ left: `${benchPct}%` }}
                          className="absolute top-0 bottom-0 w-1 bg-amber-500 z-10"
                          title={`Target: ${benchmark.toFixed(1)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
              )}
        </CardBody>
      </Card>
      </>
      )}
    </div>
  );
};

export default CompetencyView;
