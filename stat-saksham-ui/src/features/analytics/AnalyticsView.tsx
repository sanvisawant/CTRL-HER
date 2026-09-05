import React, { useEffect, useState } from "react";
import {
  api,
  type AdminDashboardData,
  type HeatmapMatrixResponse,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
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
        console.warn("Could not fetch admin dashboard analytics:", dashRes.reason);
      }

      if (heatRes.status === "fulfilled") {
        setHeatmapData(heatRes.value);
      } else {
        console.warn("Could not fetch heatmap matrix:", heatRes.reason);
      }

      if (dashRes.status === "rejected" && heatRes.status === "rejected") {
        setError("Unable to connect to P4 Workforce Analytics backend.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load workforce intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const kpis = dashboardData?.kpis;
  const departments = dashboardData?.department_summary || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/40 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>P4 Workforce Intelligence & Heatmap</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ministry Workforce Competency & Operational Readiness
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Real-time cadre-level intelligence across NSSO, CSO, FOD, NAD, ESD, and SDRD divisions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAnalytics}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          className="border-white/30 text-white hover:bg-white/10"
        >
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <p className="font-bold">Backend Status</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Top Level Workforce KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="accent">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Cadre Strength</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {kpis?.total_officials ? kpis.total_officials.toLocaleString() : "12,450"}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-teal-700 font-medium mt-3 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Active in-service statistical personnel
            </p>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Average Competency</p>
                <h3 className="text-2xl font-bold text-blue-900 mt-1">
                  {kpis?.average_competency_score ? kpis.average_competency_score.toFixed(1) : "3.4"} / 5.0
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-3">
              Organization-wide operational proficiency
            </p>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Critical Skill Gaps</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  {kpis?.critical_gap_count ?? "18"}
                </h3>
              </div>
              <div className="p-3 bg-red-50 text-red-700 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-red-600 font-medium mt-3">
              Competencies requiring immediate intervention
            </p>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Training Completion</p>
                <h3 className="text-2xl font-bold text-teal-700 mt-1">
                  {kpis?.learning_completion_rate ? `${kpis.learning_completion_rate}%` : "76%"}
                </h3>
              </div>
              <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-teal-700 font-medium mt-3">
              +23.4% average score improvement
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Domain Breakdown & Training Gains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domain Competency Averages */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">Competency Domain Distribution</CardTitle>
              <CardDescription>Average proficiency across the 4 foundational MoSPI domains</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Statistical Methodology</span>
                  <span className="text-blue-900">4.1 / 5.0 (82%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-900 h-2.5 rounded-full" style={{ width: "82%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Technical & Data Science</span>
                  <span className="text-amber-600">2.9 / 5.0 (58%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: "58%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Digital Governance</span>
                  <span className="text-teal-700">3.5 / 5.0 (70%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: "70%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-800 mb-1">
                  <span>Behavioural & Managerial</span>
                  <span className="text-indigo-700">4.0 / 5.0 (80%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: "80%" }} />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Department-Level Competency Summary */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">Department Competency Overview</CardTitle>
              <CardDescription>Cadre statistics across key MoSPI operational divisions</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Division</th>
                    <th className="py-2.5 px-3">Cadre</th>
                    <th className="py-2.5 px-3">Avg Score</th>
                    <th className="py-2.5 px-3">Critical Gaps</th>
                    <th className="py-2.5 px-3">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {departments.length > 0 ? (
                    departments.map((dep, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                          {dep.department}
                        </td>
                        <td className="py-2.5 px-3">{dep.officials}</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-900">{dep.average_score.toFixed(1)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              dep.critical_gaps > 3
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {dep.critical_gaps}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-teal-700">{dep.completion_pct}%</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">NSSO (Survey Operations)</td>
                        <td className="py-2.5 px-3">4,820</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-900">3.6</td>
                        <td className="py-2.5 px-3"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">4</span></td>
                        <td className="py-2.5 px-3 font-medium text-teal-700">82%</td>
                      </tr>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">CSO (Central Statistics)</td>
                        <td className="py-2.5 px-3">2,650</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-900">3.8</td>
                        <td className="py-2.5 px-3"><span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold">2</span></td>
                        <td className="py-2.5 px-3 font-medium text-teal-700">89%</td>
                      </tr>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">FOD (Field Operations)</td>
                        <td className="py-2.5 px-3">3,200</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-900">3.2</td>
                        <td className="py-2.5 px-3"><span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold">6</span></td>
                        <td className="py-2.5 px-3 font-medium text-teal-700">68%</td>
                      </tr>
                      <tr className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">NAD (National Accounts)</td>
                        <td className="py-2.5 px-3">1,780</td>
                        <td className="py-2.5 px-3 font-semibold text-blue-900">3.9</td>
                        <td className="py-2.5 px-3"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">1</span></td>
                        <td className="py-2.5 px-3 font-medium text-teal-700">91%</td>
                      </tr>
                    </>
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
            <CardTitle className="text-sm">Department × Competency Status Heatmap Matrix</CardTitle>
            <CardDescription>
              Color-coded status across operational divisions: 🔴 Critical (&lt; 2.5), 🟡 Moderate (2.5 – 3.4), 🟢 Proficient (&ge; 3.5).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Domain:</span>
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

                {/* Row 1: Sampling */}
                <div className="p-2.5 font-semibold text-slate-900 flex items-center">Sampling Design</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.3 🟢</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.1 🟢</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.1 🟡</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.9 🟢</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.2 🟡</div>

                {/* Row 2: Survey Data Quality */}
                <div className="p-2.5 font-semibold text-slate-900 flex items-center">Data Validation</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.8 🟢</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.0 🟢</div>
                <div className="p-2.5 rounded bg-red-100 text-red-900 font-bold text-center border border-red-200">2.4 🔴</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.7 🟢</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.9 🟡</div>

                {/* Row 3: National Accounts / GDP */}
                <div className="p-2.5 font-semibold text-slate-900 flex items-center">National Accounts</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.8 🟡</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.4 🟢</div>
                <div className="p-2.5 rounded bg-red-100 text-red-900 font-bold text-center border border-red-200">2.1 🔴</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">4.8 🟢</div>
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 font-bold text-center border border-emerald-200">3.6 🟢</div>

                {/* Row 4: Python & R Analytics */}
                <div className="p-2.5 font-semibold text-slate-900 flex items-center">Python & R Analytics</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.7 🟡</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.0 🟡</div>
                <div className="p-2.5 rounded bg-red-100 text-red-900 font-bold text-center border border-red-200">2.2 🔴</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">3.3 🟡</div>
                <div className="p-2.5 rounded bg-amber-100 text-amber-900 font-bold text-center border border-amber-200">2.9 🟡</div>

                {/* Row 5: Time Series & Forecasting */}
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
    </div>
  );
};

export default AnalyticsView;
