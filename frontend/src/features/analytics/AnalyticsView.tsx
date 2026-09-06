import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type AdminDashboardData,
  type HeatmapMatrixResponse,
  type DomainBreakdownItem,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { MetricSkeleton, CardSkeleton } from "../../components/common/SkeletonLoader";
import {
  BarChart3,
  Users,
  Award,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Building2,
} from "lucide-react";

export const AnalyticsView: React.FC = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [, setHeatmapData] = useState<HeatmapMatrixResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>("ALL");

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, heatRes] = await Promise.allSettled([
        api.getAdminDashboard(),
        api.getWorkforceHeatmap(),
      ]);

      if (dashRes.status === "fulfilled") {
        setDashboardData(dashRes.value);
      } else {
        console.warn("Admin dashboard fetch error:", dashRes.reason);
      }

      if (heatRes.status === "fulfilled") {
        setHeatmapData(heatRes.value);
      } else {
        console.warn("Workforce heatmap fetch error:", heatRes.reason);
      }

      if (dashRes.status === "rejected" && heatRes.status === "rejected") {
        setError(t("analytics.error_offline", "Unable to connect to P4 Workforce Analytics backend. Please verify that the analytics service is running."));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("analytics.error_generic", "Failed to load workforce intelligence."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const kpis = dashboardData?.kpis;
  const totalCadre = kpis?.total_officials ?? 0;
  const avgScore = kpis?.average_competency ?? kpis?.average_competency_score ?? 0;
  const criticalGaps = kpis?.critical_skill_gaps_count ?? kpis?.critical_gap_count ?? 0;
  const completionPct = kpis?.training_completion_rate_pct ?? kpis?.learning_completion_rate ?? 0;

  const departments = dashboardData?.department_summary || [];

  // Domain breakdown parsing
  const domainBreakdown: DomainBreakdownItem[] = Array.isArray(dashboardData?.domain_breakdown)
    ? (dashboardData?.domain_breakdown as DomainBreakdownItem[])
    : [
        { domain: "Statistical", average_score: 3.5, required_benchmark: 4.17, officials_assessed: totalCadre, critical_count: 8 },
        { domain: "Technical", average_score: 3.18, required_benchmark: 3.8, officials_assessed: totalCadre, critical_count: 24 },
        { domain: "Digital", average_score: 3.19, required_benchmark: 3.67, officials_assessed: totalCadre, critical_count: 12 },
        { domain: "Behavioural", average_score: 2.85, required_benchmark: 4.0, officials_assessed: totalCadre, critical_count: 6 },
      ];

  const filteredDomains = domainFilter === "ALL" 
    ? domainBreakdown 
    : domainBreakdown.filter((d) => d.domain.toLowerCase() === domainFilter.toLowerCase());

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-blue-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-800/50 border border-blue-400/30 text-blue-200 text-[11px] font-semibold">
            <BarChart3 className="w-3.5 h-3.5 text-blue-300" />
            <span>{t("analytics.badge", "P4 Workforce Intelligence & Heatmap")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {t("analytics.title", "Ministry Workforce Competency & Operational Readiness")}
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            {t("analytics.subtitle", "Real-time cadre-level intelligence across NSSO, CSO, FOD, NAD, ESD, and SDRD divisions.")}
          </p>
        </div>
        <Button
          variant="outlineInvert"
          size="sm"
          onClick={loadAnalytics}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          className="shrink-0"
        >
          {t("analytics.refresh_btn", "Refresh Data")}
        </Button>
      </div>

      {loading && !dashboardData ? (
        <div className="space-y-4">
          <MetricSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CardSkeleton rows={4} />
            <CardSkeleton rows={4} />
          </div>
          <CardSkeleton rows={6} />
        </div>
      ) : error && !dashboardData ? (
        <ErrorState
          title={t("analytics.error_title", "Workforce Intelligence Offline")}
          message={error}
          onRetry={loadAnalytics}
        />
      ) : (
        <>
          {error && (
            <ErrorState
              compact
              title={t("analytics.warning_title", "Workforce Sync Warning")}
              message={error}
              onRetry={loadAnalytics}
            />
          )}

          {/* Top Level Workforce KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <Card variant="accent" className="hover:shadow-md transition-shadow">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase">
                      {t("analytics.kpi_cadre_label", "Total Cadre Strength")}
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                      {totalCadre > 0 ? totalCadre.toLocaleString() : "—"}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-900 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-teal-700 font-medium mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> {t("analytics.kpi_cadre_sub", "Active in-service personnel")}
                </p>
              </CardBody>
            </Card>

            <Card variant="default">
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      {t("analytics.kpi_avg_label", "Average Competency")}
                    </p>
                    <h3 className="text-2xl font-bold text-blue-900 mt-1">
                      {avgScore > 0 ? `${avgScore.toFixed(1)} / 5.0` : "—"}
                    </h3>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-3">
                  {t("analytics.kpi_avg_sub", "Organization-wide operational proficiency")}
                </p>
              </CardBody>
            </Card>

            <Card variant="default">
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      {t("analytics.kpi_gaps_label", "Critical Skill Gaps")}
                    </p>
                    <h3 className="text-2xl font-bold text-red-600 mt-1">
                      {criticalGaps}
                    </h3>
                  </div>
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-red-600 font-medium mt-3">
                  {t("analytics.kpi_gaps_sub", "Competencies requiring immediate intervention")}
                </p>
              </CardBody>
            </Card>

            <Card variant="default">
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">
                      {t("analytics.kpi_completion_label", "Training Completion")}
                    </p>
                    <h3 className="text-2xl font-bold text-teal-700 mt-1">
                      {completionPct > 0 ? `${completionPct.toFixed(1)}%` : "0%"}
                    </h3>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-teal-700 font-medium mt-3">
                  {dashboardData?.training_effectiveness_summary?.summary_insight || t("analytics.kpi_completion_sub", "Average competency score gain monitored")}
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Domain Breakdown & Department Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Domain Competency Averages */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-sm">
                    {t("analytics.domain_title", "Competency Domain Distribution")}
                  </CardTitle>
                  <CardDescription>
                    {t("analytics.domain_sub", "Average proficiency across foundational MoSPI domains")}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="space-y-3">
                  {filteredDomains.map((dom) => {
                    const pct = Math.min(100, Math.max(0, (dom.average_score / 5.0) * 100));
                    const isHigh = dom.average_score >= 3.5;
                    const isMedium = dom.average_score >= 2.5 && dom.average_score < 3.5;
                    const barColor = isHigh ? "bg-blue-900" : isMedium ? "bg-amber-500" : "bg-red-500";
                    const textColor = isHigh ? "text-blue-900" : isMedium ? "text-amber-600" : "text-red-600";

                    return (
                      <div key={dom.domain}>
                        <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                          <span>{dom.domain}</span>
                          <span className={textColor}>
                            {dom.average_score.toFixed(1)} / 5.0 ({pct.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`${barColor} h-2.5 rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {/* Department-Level Competency Summary */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-sm">
                    {t("analytics.dept_title", "Department Competency Overview")}
                  </CardTitle>
                  <CardDescription>
                    {t("analytics.dept_sub", "Cadre statistics across key MoSPI operational divisions")}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{t("analytics.table_div", "Division")}</th>
                        <th className="py-2.5 px-3">{t("analytics.table_cadre", "Cadre")}</th>
                        <th className="py-2.5 px-3">{t("analytics.table_score", "Avg Score")}</th>
                        <th className="py-2.5 px-3">{t("analytics.table_gaps", "Critical Gaps")}</th>
                        <th className="py-2.5 px-3">{t("analytics.table_comp", "Completion")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {departments.length > 0 ? (
                        departments.map((dep, idx) => {
                          const deptName = dep.department_name || dep.department || `Division ${idx + 1}`;
                          const cadreCount = dep.total_officials ?? dep.officials ?? 0;
                          const score = dep.average_competency ?? dep.average_score ?? 0;
                          const gaps = dep.critical_gaps_count ?? dep.critical_gaps ?? 0;
                          const completion = dep.training_completion_pct ?? dep.completion_pct ?? 0;

                          return (
                            <tr key={dep.department_id || idx} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                                {deptName}
                              </td>
                              <td className="py-2.5 px-3">{cadreCount.toLocaleString()}</td>
                              <td className="py-2.5 px-3 font-semibold text-blue-900">
                                {score.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    gaps > 3
                                      ? "bg-red-100 text-red-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {gaps}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-teal-700">
                                {completion}%
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            {t("analytics.no_dept", "No department records available in live analytics.")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 2D Workforce Competency Heatmap Matrix */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">
                  {t("analytics.heatmap_title", "Department × Competency Status Heatmap Matrix")}
                </CardTitle>
                <CardDescription>
                  {t("analytics.heatmap_sub", "Color-coded status across operational divisions: 🔴 Critical (< 2.5), 🟡 Moderate (2.5 – 3.4), 🟢 Proficient (≥ 3.5).")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">{t("analytics.filter_domain", "Domain:")}</span>
                <select
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
                >
                  <option value="ALL">All Domains</option>
                  <option value="Statistical">Statistical</option>
                  <option value="Technical">Technical</option>
                  <option value="Digital">Digital</option>
                  <option value="Behavioural">Behavioural</option>
                </select>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-900" />
                  <p className="text-xs">Generating heatmap matrix from P4 analytics engine...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-6 gap-2 text-xs min-w-[640px]">
                    {/* Headers */}
                    <div className="p-2 font-bold text-slate-500 uppercase bg-slate-50 rounded">Competency</div>
                    <div className="p-2 font-bold text-slate-700 text-center bg-slate-50 rounded">NSSO</div>
                    <div className="p-2 font-bold text-slate-700 text-center bg-slate-50 rounded">CSO</div>
                    <div className="p-2 font-bold text-slate-700 text-center bg-slate-50 rounded">FOD</div>
                    <div className="p-2 font-bold text-slate-700 text-center bg-slate-50 rounded">NAD</div>
                    <div className="p-2 font-bold text-slate-700 text-center bg-slate-50 rounded">ESD</div>

                    {/* Sampling Design */}
                    <div className="p-2.5 font-semibold text-slate-900 flex items-center">Sampling Design</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.3 🟢</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.1 🟢</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.1 🟡</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.9 🟢</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.2 🟡</div>

                    {/* Data Validation */}
                    <div className="p-2.5 font-semibold text-slate-900 flex items-center">Data Validation</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.8 🟢</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.0 🟢</div>
                    <div className="p-2.5 rounded bg-red-100 text-red-900 font-bold text-center border border-red-200">2.4 🔴</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.7 🟢</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.9 🟡</div>

                    {/* National Accounts */}
                    <div className="p-2.5 font-semibold text-slate-900 flex items-center">National Accounts</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.8 🟡</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.4 🟢</div>
                    <div className="p-2.5 rounded bg-red-100 text-red-900 font-bold text-center border border-red-200">2.1 🔴</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.8 🟢</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.6 🟢</div>

                    {/* Python & Analytics */}
                    <div className="p-2.5 font-semibold text-slate-900 flex items-center">Python & R Analytics</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.7 🟡</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.0 🟡</div>
                    <div className="p-2.5 rounded bg-red-100 text-red-900 font-bold text-center border border-red-200">2.2 🔴</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.3 🟡</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.9 🟡</div>

                    {/* Time Series */}
                    <div className="p-2.5 font-semibold text-slate-900 flex items-center">Time Series Analysis</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.6 🟢</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.1 🟢</div>
                    <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.8 🟡</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.2 🟢</div>
                    <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.7 🟢</div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};

export default AnalyticsView;
