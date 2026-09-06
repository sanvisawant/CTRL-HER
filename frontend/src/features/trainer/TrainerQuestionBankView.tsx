import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type QuestionBankItem,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { CardSkeleton } from "../../components/common/SkeletonLoader";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export const TrainerQuestionBankView: React.FC = () => {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadQuestionBank = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuestionBank();
      setQuestions(res.items || []);
    } catch (err: unknown) {
      console.warn("Failed to load question bank:", err);
      setError(t("trainer.error_qb", "Unable to retrieve question bank items from assessment backend."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestionBank();
  }, []);

  const handleApprove = async (questionId: string) => {
    setActionInProgress(questionId);
    setActionNotice(null);
    try {
      const updated = await api.approveQuestion(questionId);
      setQuestions((prev) =>
        prev.map((q) => (q.question_id === questionId ? updated : q))
      );
      setActionNotice(t("trainer.approved_notice", `Question #${questionId} approved for official learner assessments.`));
    } catch (err: unknown) {
      console.error("Failed to approve question:", err);
      setError(t("trainer.approve_fail", `Failed to approve question #${questionId}.`));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (questionId: string) => {
    setActionInProgress(questionId);
    setActionNotice(null);
    try {
      const updated = await api.rejectQuestion(questionId);
      setQuestions((prev) =>
        prev.map((q) => (q.question_id === questionId ? updated : q))
      );
      setActionNotice(t("trainer.rejected_notice", `Question #${questionId} marked as rejected and excluded from assessments.`));
    } catch (err: unknown) {
      console.error("Failed to reject question:", err);
      setError(t("trainer.reject_fail", `Failed to reject question #${questionId}.`));
    } finally {
      setActionInProgress(null);
    }
  };

  // Status counts
  const draftCount = questions.filter((q) => q.status === "DRAFT").length;
  const reviewCount = questions.filter((q) => q.status === "REVIEW").length;
  const approvedCount = questions.filter((q) => q.status === "APPROVED").length;
  const rejectedCount = questions.filter((q) => q.status === "REJECTED").length;

  const filteredQuestions = questions.filter((q) => {
    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.question_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-indigo-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-800/50 border border-indigo-400/30 text-indigo-200 text-[11px] font-semibold">
            <FileCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>{t("trainer.badge", "P3 Trainer Assessment & Item Banking")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {t("trainer.title", "MoSPI Question Bank & Pedagogical Governance")}
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            {t("trainer.subtitle", "Review, calibrate, and approve grounded MCQs generated from official manuals. Learner assessments only draw from APPROVED questions.")}
          </p>
        </div>
        <Button
          variant="outlineInvert"
          size="sm"
          onClick={loadQuestionBank}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          className="shrink-0"
        >
          {t("trainer.refresh_btn", "Refresh Bank")}
        </Button>
      </div>

      {/* Security Governance Notice */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
        <span>
          <strong>{t("trainer.governance_label", "Quality Assurance Rule:")}</strong>{" "}
          {t(
            "trainer.governance_text",
            "In accordance with MoSPI examination guidelines, learners only receive APPROVED diagnostic questions. Questions in DRAFT, REVIEW, or REJECTED status remain locked to trainers."
          )}
        </span>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: "ALL", label: t("trainer.filter_all", "All Items"), count: questions.length },
                { id: "APPROVED", label: t("trainer.filter_approved", "Approved"), count: approvedCount, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { id: "REVIEW", label: t("trainer.filter_review", "In Review"), count: reviewCount, color: "text-amber-700 bg-amber-50 border-amber-200" },
                { id: "DRAFT", label: t("trainer.filter_draft", "Draft"), count: draftCount, color: "text-slate-700 bg-slate-100 border-slate-200" },
                { id: "REJECTED", label: t("trainer.filter_rejected", "Rejected"), count: rejectedCount, color: "text-red-700 bg-red-50 border-red-200" },
              ].map((pill) => {
                const isActive = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("trainer.search_placeholder", "Filter questions, topics...")}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <CardSkeleton key={n} lines={4} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title={t("trainer.error_title", "Question Bank Sync Offline")}
          message={error}
          onRetry={loadQuestionBank}
        />
      ) : filteredQuestions.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="w-6 h-6 text-slate-400" />}
          title={t("trainer.no_questions_title", "No Questions Found")}
          description={t(
            "trainer.no_questions_desc",
            `No questions match status "${statusFilter}" and search query "${searchQuery}".`
          )}
          actionText={t("trainer.reset_filters", "Reset Filters")}
          onAction={() => {
            setStatusFilter("ALL");
            setSearchQuery("");
          }}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredQuestions.map((q) => {
            const isProcessing = actionInProgress === q.question_id;
            const statusBadgeColor =
              q.status === "APPROVED"
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : q.status === "REVIEW"
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : q.status === "REJECTED"
                ? "bg-red-100 text-red-800 border-red-300"
                : "bg-slate-100 text-slate-800 border-slate-300";

            return (
              <Card key={q.question_id} className="hover:border-blue-900/30 transition-all">
                <CardBody className="p-4 sm:p-5 space-y-3">
                  {/* Top Metadata Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        #{q.question_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusBadgeColor}`}
                      >
                        {q.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900">
                        {q.difficulty || "medium"}
                      </span>
                      {q.topic && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {q.topic}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                        {q.origin || "GENERATED"}
                      </span>
                    </div>

                    {/* Review Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {q.status !== "APPROVED" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApprove(q.question_id)}
                          disabled={isProcessing}
                          isLoading={isProcessing}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        >
                          {t("trainer.btn_approve", "Approve")}
                        </Button>
                      )}
                      {q.status !== "REJECTED" && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleReject(q.question_id)}
                          disabled={isProcessing}
                          isLoading={isProcessing}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          {t("trainer.btn_reject", "Reject")}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Question Stem */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {q.question}
                  </h4>

                  {/* Multiple Choice Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(q.options || []).map((opt) => {
                      const isCorrect = opt.id === q.correct_answer;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                            isCorrect
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isCorrect
                                ? "bg-emerald-700 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="leading-snug">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pedagogical Explanation & Provenance */}
                  {q.explanation && (
                    <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs text-slate-800 space-y-1">
                      <p className="font-semibold text-amber-900 text-[11px] flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        {t("trainer.explanation_label", "Trainer Guidance & Explanation:")}
                      </p>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}

                  {/* Grounded Source Manual Citation */}
                  {q.source && (
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-900" />
                        {t("trainer.source_label", "Grounded in:")}{" "}
                        <strong className="text-slate-700">{q.source.document}</strong>
                        {q.source.locations?.length ? ` (${q.source.locations.join(", ")})` : ""}
                      </span>
                      <span>
                        Created: {new Date(q.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrainerQuestionBankView;
