import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  api,
  type QuestHomeData,
  type QuestSubmissionResponse,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { MetricSkeleton, CardSkeleton } from "../../components/common/SkeletonLoader";
import {
  Compass,
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
      setSubmitting(false);
    }
  };

  const level = questData?.level ?? 1;
  const xp = questData?.xp ?? 0;
  const xpNext = questData?.xp_for_next_level || 1000;
  const streak = questData?.streak_days ?? 0;
  const xpPct = xpNext > 0 ? Math.min(100, (xp / xpNext) * 100) : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner (Compact & Dignified) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-blue-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-800/50 border border-blue-400/30 text-blue-200 text-[11px] font-semibold">
            <Compass className="w-3.5 h-3.5 text-blue-300" />
            <span>P4 Competency Quest & Gamified Mastery</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Statistical Gamification & Daily Micro-Missions
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            Reinforce core survey methodology and data auditing habits through real-world micro-challenges and earn official cadre milestones.
          </p>
        </div>
        <Button
          variant="outlineInvert"
          size="sm"
          onClick={loadQuestData}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          className="shrink-0"
        >
          Sync XP
        </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Level Card */}
        <Card variant="accent" className="hover:shadow-md transition-shadow">
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Officer Rank Level</p>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                Level {level}
              </h3>
              <p className="text-xs text-blue-900 font-semibold mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Senior Analyst (ISS)
              </p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-900 rounded-xl">
              <Trophy className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>

        {/* XP Progress Card */}
        <Card variant="default">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Cadre Experience (XP)</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {xp} <span className="text-slate-400 text-sm font-normal">/ {xpNext} XP</span>
                </h3>
              </div>
              <div className="p-3.5 bg-amber-100 text-amber-700 rounded-2xl">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
              <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${xpPct}%` }} />
            </div>
          </CardBody>
        </Card>

        {/* Streak Card */}
        <Card variant="default">
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Active Practice Streak</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {streak} Days 🔥
              </h3>
              <p className="text-xs text-orange-600 font-semibold mt-1">
                Bonus +25% XP multiplier active
              </p>
            </div>
            <div className="p-3.5 bg-orange-100 text-orange-600 rounded-2xl">
              <Flame className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Grid: Daily Micro-Challenge + Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's 2-Minute Micro-Challenge */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 uppercase">
                    Daily Micro-Challenge
                  </span>
                  <span className="text-xs text-slate-500">2-Minute Scenario</span>
                </div>
                <CardTitle className="text-sm mt-1">Data Detective: Outlier Anomaly in NSSO Urban Frame</CardTitle>
                <CardDescription>
                  Review the sample enumerator records below and identify the critical survey data quality flaw.
                </CardDescription>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-600" /> +50 XP
              </span>
            </CardHeader>
            <CardBody className="space-y-4">
              {/* Scenario Context Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 space-y-1">
                <p className="text-slate-500 text-[11px] font-sans font-semibold">Enumerator Record #FOD-8921:</p>
                <p className="p-2 bg-white rounded border border-slate-200 text-xs">
                  Household ID: HH-4029 | Sector: Urban | Monthly Consumption (MPCE): <span className="text-red-600 font-bold">9999999</span> | Household Size: 4
                </p>
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2">
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
                      className={`w-full p-3 rounded-lg border text-left text-xs transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "bg-blue-900 text-white border-blue-900 font-semibold shadow-xs"
                          : "bg-white text-slate-800 border-slate-200 hover:border-blue-900/40 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isSelected ? "bg-white text-blue-900" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="leading-snug">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action / Submit Result */}
              {!submitResult ? (
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSubmitDaily}
                    disabled={!selectedAnswer || submitting}
                    isLoading={submitting}
                    rightIcon={<Target className="w-4 h-4" />}
                  >
                    {submitting ? "Evaluating Challenge..." : "Submit Answer"}
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-green-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-700" /> Challenge Completed!
                    </span>
                    <span className="bg-green-200 text-green-900 px-2 py-0.5 rounded text-[11px]">
                      +{submitResult.xp_awarded} XP Earned
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {submitResult.explanation}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right 1 Col: Active Missions & Badges */}
        <div className="space-y-6">
          {/* Active Missions */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official In-Service Missions
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 pt-0 space-y-3">
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Sampling Design Master</span>
                  <span className="text-amber-700 font-bold text-[11px]">+120 XP</span>
                </div>
                <p className="text-[11px] text-slate-500">Complete 3 NSS sampling diagnostic quizzes with &gt; 80% score.</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-blue-900 h-1.5 rounded-full" style={{ width: "66%" }} />
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5">Progress: 2 of 3 Completed</span>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Digital Twin Milestone</span>
                  <span className="text-amber-700 font-bold text-[11px]">+200 XP</span>
                </div>
                <p className="text-[11px] text-slate-500">Eliminate high-priority competency gaps in Technical Domain.</p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-teal-700 h-1.5 rounded-full" style={{ width: "40%" }} />
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5">Progress: 2 of 5 Competencies</span>
              </div>
            </CardBody>
          </Card>

          {/* Unlocked Badges */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cadre Honor Badges
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-1">
                  <Award className="w-6 h-6 text-blue-900 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">Survey Sentinel</p>
                  <p className="text-[10px] text-slate-500">100% Quality Audits</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1">
                  <Trophy className="w-6 h-6 text-amber-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-900">Outlier Hunter</p>
                  <p className="text-[10px] text-slate-500">Daily Streak Master</p>
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
