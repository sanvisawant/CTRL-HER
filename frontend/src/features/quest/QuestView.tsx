import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  api,
  type QuestHomeData,
  type QuestSubmissionResponse,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { ErrorState } from "../../components/common/ErrorState";
import { MetricSkeleton, CardSkeleton } from "../../components/common/SkeletonLoader";
import {
  Trophy,
  Flame,
  Sparkles,
  Award,
  CheckCircle2,
  RefreshCw,
  Zap,
  Target,
  ShieldCheck,
} from "lucide-react";

export const QuestView: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";

  const [questData, setQuestData] = useState<QuestHomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Daily Challenge State
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<QuestSubmissionResponse | null>(null);

  const loadQuestData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQuestHome(cadreId);
      setQuestData(data);
    } catch (err: unknown) {
      console.warn("Could not load quest home data:", err);
      setError("Unable to connect to P4 Gamification Hub.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestData();
  }, [cadreId]);

  const handleSubmitDaily = async () => {
    if (!selectedAnswer || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.submitQuestChallenge({
        user_id: cadreId,
        challenge_type: "daily_challenge",
        challenge_id: questData?.daily_challenge_id || "qst_daily_01",
        answers: selectedAnswer,
      });
      setSubmitResult(result);
      if (questData && result && result.success !== false) {
        setQuestData({
          ...questData,
          xp: result.new_total_xp ?? (questData.xp + (result.xp_awarded || 0)),
          level: result.new_level || questData.level,
        });
      }
    } catch (err: unknown) {
      console.error("Daily challenge submission failed:", err);
      setError("Challenge submission could not be evaluated at this time. Please retry.");
      setSubmitResult(null);
    } finally {
      setLoading(false);
    }
  };

  const level = questData?.level ?? 1;
  const xp = questData?.xp ?? 0;
  const xpNext = questData?.xp_for_next_level || 1000;
  const streak = questData?.streak_days ?? 0;
  const xpPct = xpNext > 0 ? Math.min(100, (xp / xpNext) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Light Spacious LMS Hero */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-orange-600 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              Competency Quest & Missions
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {t("quest.title", "Statistical Gamification & Daily Micro-Missions")}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed mt-1">
              {t("quest.subtitle", "Reinforce core survey methodology and data auditing habits through real-world micro-challenges and earn official cadre milestones.")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadQuestData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>{t("quest.sync_xp", "Sync XP")}</span>
        </button>
      </div>

      {loading && !questData ? (
        <div className="space-y-4">
          <MetricSkeleton count={3} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CardSkeleton rows={5} />
            </div>
            <CardSkeleton rows={4} />
          </div>
        </div>
      ) : error && !questData ? (
        <ErrorState
          title="Quest Hub Offline"
          message="Unable to connect to the P4 Gamification and Daily Micro-Challenge engine. Please retry to load your official missions."
          onRetry={loadQuestData}
        />
      ) : (
        <>
          {error && (
            <ErrorState
              compact
              title="Quest Sync Notice"
              message={error}
              onRetry={loadQuestData}
            />
          )}

          {/* Gamification Status Bar (Level, XP, Streak) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Level Card */}
            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">{t("quest.rank_level", "Officer Rank Level")}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  Level {level}
                </h3>
                <p className="text-xs text-indigo-900 font-semibold mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Senior Analyst (ISS)
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Trophy className="w-6 h-6" />
              </div>
            </div>

            {/* XP Progress Card */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-100 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{t("quest.experience_xp", "Cadre Experience (XP)")}</p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">
                    {xp} <span className="text-slate-400 text-sm font-normal">/ {xpNext} XP</span>
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
              <div className="w-full bg-amber-100/80 rounded-full h-2.5 mt-3 overflow-hidden">
                <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${xpPct}%` }} />
              </div>
            </div>

            {/* Streak Card — Vibrant Flame Gradient */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-amber-500 text-white shadow-md shadow-orange-500/20 flex items-center justify-between relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[11px] font-bold text-orange-100 uppercase tracking-wider">{t("quest.streak", "Daily Learning Streak")}</p>
                <h3 className="text-3xl font-black text-white mt-0.5 tracking-tight flex items-center gap-2">
                  <span>{streak} Days</span>
                  <span className="text-xl">🔥</span>
                </h3>
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                  <span>+25% XP Multiplier Active</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white relative z-10 shrink-0">
                <Flame className="w-8 h-8 text-amber-200 animate-pulse" />
              </div>
            </div>
          </div>

      {/* Main Grid: Daily Micro-Challenge + Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's 2-Minute Micro-Challenge */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs">
            <CardHeader className="p-5 sm:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-100 text-amber-900 uppercase tracking-wider">
                      {t("quest.daily_challenge_title", "Daily Micro-Challenge")}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">⏱ 2-Minute Scenario</span>
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900">Data Detective: Outlier Anomaly in NSSO Urban Frame</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Review the sample enumerator records below and identify the critical survey data quality flaw.
                  </CardDescription>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-2xs">
                  <Zap className="w-3.5 h-3.5 text-amber-600" /> +50 XP
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-5 sm:p-6 space-y-4">
              {/* Scenario Context Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-xs text-slate-800 space-y-1.5">
                <p className="text-slate-500 text-[11px] font-sans font-semibold">Enumerator Record #FOD-8921:</p>
                <p className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                  Household ID: HH-4029 | Sector: Urban | Monthly Consumption (MPCE): <span className="text-rose-600 font-bold">9999999</span> | Household Size: 4
                </p>
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5">
                {[
                  {
                    id: "A",
                    text: "The sector code must be strictly converted to rural classification.",
                  },
                  {
                    id: "B",
                    text: "MPCE of 9999999 is a standard sentinel outlier indicating missing entry, requiring verification or imputation.",
                  },
                  {
                    id: "C",
                    text: "Household size of 4 exceeds the permissible urban frame limit.",
                  },
                  {
                    id: "D",
                    text: "The record is statistically valid and requires no validation check.",
                  },
                ].map((opt) => {
                  const isSelected = selectedAnswer === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedAnswer(opt.id)}
                      disabled={submitting || !!submitResult}
                      className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                          : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected ? "bg-white text-indigo-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="leading-snug pt-0.5">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action / Submit Result */}
              {!submitResult ? (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSubmitDaily}
                    disabled={!selectedAnswer || submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer hover:-translate-y-0.5"
                  >
                    <span>{submitting ? t("quest.evaluating", "Evaluating Challenge...") : t("quest.submit_challenge", "Submit Challenge 🚀")}</span>
                    <Target className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-green-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-700" /> {t("quest.challenge_completed", "Daily Challenge Completed")}
                    </span>
                    <span className="bg-green-200 text-green-900 px-2 py-0.5 rounded text-[11px]">
                      +{submitResult.xp_awarded} {t("quest.awarded_xp", "XP Awarded")}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans">
                    {submitResult.detailed_feedback}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Cadre Peer Leaderboard */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs">
            <CardHeader className="p-5 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">{t("quest.leaderboard_title", "Cadre Peer Leaderboard")}</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">{t("quest.leaderboard_desc", "Top performing statistical officers across ministry divisions")}</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="p-5 space-y-3">
              <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/30 space-y-2 transition-all hover:bg-indigo-50/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Sampling Design Master</span>
                  <span className="text-amber-800 bg-amber-100 font-extrabold text-[11px] px-2 py-0.5 rounded-full">+120 XP</span>
                </div>
                <p className="text-[11px] text-slate-600">Complete 3 NSS sampling diagnostic quizzes with &gt; 80% score.</p>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: "66%" }} />
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5 font-medium">Progress: 2 of 3 Completed</span>
              </div>

              <div className="p-4 border border-emerald-100 rounded-xl bg-emerald-50/30 space-y-2 transition-all hover:bg-emerald-50/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Digital Twin Milestone</span>
                  <span className="text-emerald-800 bg-emerald-100 font-extrabold text-[11px] px-2 py-0.5 rounded-full">+200 XP</span>
                </div>
                <p className="text-[11px] text-slate-600">Eliminate high-priority competency gaps in Technical Domain.</p>
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: "40%" }} />
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5 font-medium">Progress: 2 of 5 Competencies</span>
              </div>
            </CardBody>
          </Card>

          {/* Unlocked Badges */}
          <Card className="rounded-2xl border-slate-200/80 shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cadre Honor Badges
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-center space-y-1.5 transition-all hover:-translate-y-0.5">
                  <Award className="w-7 h-7 text-indigo-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">Survey Sentinel</p>
                  <p className="text-[10px] text-slate-500 font-medium">100% Quality Audits</p>
                </div>
                <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl text-center space-y-1.5 transition-all hover:-translate-y-0.5">
                  <Trophy className="w-7 h-7 text-amber-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">Outlier Hunter</p>
                  <p className="text-[10px] text-slate-500 font-medium">Daily Streak Master</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default QuestView;
