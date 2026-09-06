import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type AdminDashboardData } from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import {
  Users,
  Building2,
  Search,
  RefreshCw,
  Award,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

interface CadreOfficialRecord {
  id: string;
  name: string;
  cadre_id: string;
  email: string;
  division: string;
  designation: string;
  role: "learner" | "trainer" | "admin";
  competency_level: number;
  critical_gaps: number;
  completion_pct: number;
  status: "ACTIVE" | "ON_LEAVE" | "SECONDMENT";
}

const REGISTERED_CADRE_ROSTER: CadreOfficialRecord[] = [
  {
    id: "usr_01",
    name: "Sanvi Sawant",
    cadre_id: "ISS-2024-8921",
    email: "sanvi.sawant@gov.in",
    division: "FOD (Field Operations)",
    designation: "Senior Statistical Officer (SSO)",
    role: "learner",
    competency_level: 3.8,
    critical_gaps: 2,
    completion_pct: 78,
    status: "ACTIVE",
  },
  {
    id: "usr_02",
    name: "Dr. Alok Sharma",
    cadre_id: "TRN-2024-1042",
    email: "alok.sharma@gov.in",
    division: "NSSTA / Training Academy",
    designation: "Subject Matter Specialist & Master Trainer",
    role: "trainer",
    competency_level: 4.6,
    critical_gaps: 0,
    completion_pct: 100,
    status: "ACTIVE",
  },
  {
    id: "usr_03",
    name: "Rajesh Kumar",
    cadre_id: "ADM-2024-001",
    email: "rajesh.kumar@nic.in",
    division: "Ministry Administration",
    designation: "Director General & Cadre Administrator",
    role: "admin",
    competency_level: 4.5,
    critical_gaps: 0,
    completion_pct: 95,
    status: "ACTIVE",
  },
  {
    id: "usr_04",
    name: "Sanvi Sharma",
    cadre_id: "ISS-2024-4029",
    email: "sanvi.sharma@gov.in",
    division: "NSSO (Survey Operations)",
    designation: "Assistant Director (ISS)",
    role: "learner",
    competency_level: 3.5,
    critical_gaps: 4,
    completion_pct: 62,
    status: "ACTIVE",
  },
  {
    id: "usr_05",
    name: "Amitabh Sen",
    cadre_id: "ISS-2023-3112",
    email: "amitabh.sen@gov.in",
    division: "CSO (Central Statistics)",
    designation: "Deputy Director (National Accounts)",
    role: "learner",
    competency_level: 4.1,
    critical_gaps: 1,
    completion_pct: 85,
    status: "ACTIVE",
  },
  {
    id: "usr_06",
    name: "Pooja Verma",
    cadre_id: "ISS-2024-7741",
    email: "pooja.verma@nic.in",
    division: "NAD (National Accounts)",
    designation: "Statistical Officer (SSS)",
    role: "learner",
    competency_level: 3.2,
    critical_gaps: 5,
    completion_pct: 44,
    status: "ACTIVE",
  },
  {
    id: "usr_07",
    name: "Venkatesh Raman",
    cadre_id: "ISS-2022-1920",
    email: "v.raman@gov.in",
    division: "SDRD (Survey Design)",
    designation: "Joint Director (Sampling)",
    role: "learner",
    competency_level: 4.3,
    critical_gaps: 1,
    completion_pct: 90,
    status: "ACTIVE",
  },
  {
    id: "usr_08",
    name: "Meenakshi Sundaram",
    cadre_id: "ISS-2024-6019",
    email: "m.sundaram@nic.in",
    division: "ESD (Economic Statistics)",
    designation: "Senior Statistical Officer",
    role: "learner",
    competency_level: 3.4,
    critical_gaps: 3,
    completion_pct: 70,
    status: "ACTIVE",
  },
];

export const AdminUserManagementView: React.FC = () => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [divisionFilter, setDivisionFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminDashboard();
      setDashboardData(data);
    } catch (err: unknown) {
      console.warn("Failed to load admin dashboard stats for user management:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCadre = dashboardData?.kpis?.total_officials ?? REGISTERED_CADRE_ROSTER.length;
  const avgCompetency = dashboardData?.kpis?.average_competency ?? 3.2;

  const filteredRoster = REGISTERED_CADRE_ROSTER.filter((official) => {
    const matchesDiv =
      divisionFilter === "ALL" ||
      official.division.toLowerCase().includes(divisionFilter.toLowerCase());
    const matchesRole = roleFilter === "ALL" || official.role === roleFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      official.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      official.cadre_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      official.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      official.division.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDiv && matchesRole && matchesQuery;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-blue-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-800/50 border border-blue-400/30 text-blue-200 text-[11px] font-semibold">
            <Users className="w-3.5 h-3.5 text-blue-300" />
            <span>{t("admin.badge", "P4 Cadre Management & Administrative Governance")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {t("admin.title", "Ministry Official Cadre Roster & Role Authorization")}
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            {t("admin.subtitle", "Comprehensive personnel governance across Indian Statistical Service (ISS) and Subordinate Statistical Service (SSS) cadres.")}
          </p>
        </div>
        <Button
          variant="outlineInvert"
          size="sm"
          onClick={loadData}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          className="shrink-0"
        >
          {t("admin.refresh_btn", "Refresh Roster")}
        </Button>
      </div>

      {/* Cadre Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <Card variant="accent">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">{t("admin.total_cadre", "Monitored Cadre")}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalCadre.toLocaleString()}</h3>
              <p className="text-[11px] text-teal-700 font-medium mt-1">{REGISTERED_CADRE_ROSTER.length} registered on portal</p>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-900 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">{t("admin.avg_comp", "Avg Cadre Score")}</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-0.5">{avgCompetency.toFixed(1)} / 5.0</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Benchmark: 3.8 / 5.0</p>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">{t("admin.active_learners", "Active Learners")}</p>
              <h3 className="text-2xl font-bold text-teal-700 mt-0.5">11</h3>
              <p className="text-[11px] text-teal-700 font-medium mt-1">Engaged in last 7 days</p>
            </div>
            <div className="p-2.5 bg-teal-50 text-teal-700 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>

        <Card variant="default">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">{t("admin.divisions_count", "Key Divisions")}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">6</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">NSSO, CSO, FOD, NAD, ESD, SDRD</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Roster Controls & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div>
              <CardTitle className="text-sm">{t("admin.roster_title", "Cadre Officials Personnel Roster")}</CardTitle>
              <CardDescription>{t("admin.roster_desc", "Authenticated ministry officers, training faculty, and nodal administrators.")}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Division Filter */}
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Divisions</option>
                <option value="FOD">FOD (Field Operations)</option>
                <option value="NSSO">NSSO (Survey Operations)</option>
                <option value="CSO">CSO (Central Statistics)</option>
                <option value="NAD">NAD (National Accounts)</option>
                <option value="SDRD">SDRD (Survey Design)</option>
                <option value="ESD">ESD (Economic Statistics)</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="learner">Learner (Officer)</option>
                <option value="trainer">Master Trainer</option>
                <option value="admin">Administrator</option>
              </select>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cadre..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Officer Name</th>
                  <th className="py-2.5 px-3">Cadre ID</th>
                  <th className="py-2.5 px-3">Division</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Competency</th>
                  <th className="py-2.5 px-3">Gaps</th>
                  <th className="py-2.5 px-3">Completion</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRoster.map((official) => {
                  const roleBadge =
                    official.role === "admin"
                      ? "bg-purple-100 text-purple-800 border-purple-200"
                      : official.role === "trainer"
                      ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                      : "bg-blue-50 text-blue-800 border-blue-200";

                  return (
                    <tr key={official.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{official.name}</div>
                        <div className="text-[10px] text-slate-400">{official.designation}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-800">
                        {official.cadre_id}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{official.division}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge}`}>
                          {official.role === "admin" ? "ADMIN" : official.role === "trainer" ? "TRAINER" : "OFFICER"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-blue-900">
                        {official.competency_level.toFixed(1)} / 5.0
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            official.critical_gaps > 2
                              ? "bg-red-100 text-red-700"
                              : official.critical_gaps > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {official.critical_gaps}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-teal-700">{official.completion_pct}%</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> {official.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AdminUserManagementView;
