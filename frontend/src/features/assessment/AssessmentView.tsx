import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  api,
  type QuizResponse,
  type QuizResult,
  type SingleAnswerSubmission,
  type DocumentItem,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import {
  Target,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  FolderArchive,
} from "lucide-react";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";

export const AssessmentView: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";

  // Documents for quiz creation
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizResponse | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [docsLoading, setDocsLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available documents on mount
  useEffect(() => {
    const fetchDocs = async () => {
      setDocsLoading(true);
      try {
        const res = await api.fetchDocuments();
        if (res.documents && res.documents.length > 0) {
          setDocuments(res.documents);
          setSelectedDocId(res.documents[0].document_id);
        }
      } catch (err: unknown) {
        console.warn("Could not fetch documents for quiz generation:", err);
      } finally {
        setDocsLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const handleStartQuiz = async () => {
    if (!selectedDocId) {
      setError("Please select a MoSPI documentation manual to generate questions from.");
      return;
    }
    setLoading(true);
    setError(null);
    setQuizResult(null);
    setSelectedAnswers({});

    try {
      const quiz = await api.createQuiz({
        document_id: selectedDocId,
        count: questionCount,
        difficulty,
        learner_id: cadreId,
      });
      setActiveQuiz(quiz);
    } catch (err: unknown) {
      console.error("Failed to generate quiz:", err);
      setError("Failed to generate assessment questions from the selected document.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: "A" | "B" | "C" | "D") => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || submitting) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount === 0) {
      setError("Please select an option for at least one question before submitting your evaluation.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const answersPayload: SingleAnswerSubmission[] = activeQuiz.questions.map((q) => ({
      question_id: q.question_id,
      selected_answer: selectedAnswers[q.question_id] || null,
    }));

    try {
      const result = await api.submitQuiz(activeQuiz.quiz_id, answersPayload);
      setQuizResult(result);
    } catch (err: unknown) {
      console.error("Quiz submission failed:", err);
      setError("Failed to evaluate quiz submission on backend. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setActiveQuiz(null);
    setQuizResult(null);
    setSelectedAnswers({});
    setError(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner (Compact & Dignified) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-blue-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-800/50 border border-blue-400/30 text-blue-200 text-[11px] font-semibold">
            <Target className="w-3.5 h-3.5 text-blue-300" />
            <span>{t("assessment.badge", "P2 Continuous Evaluation Engine")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {t("assessment.title", "Adaptive Competency Quizzes & APAR Knowledge Checks")}
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            {t("assessment.subtitle", "Official in-service competency assessment generated from verified MoSPI knowledge manuals.")}
          </p>
        </div>
        {activeQuiz && !quizResult && (
          <Button
            variant="outlineInvert"
            size="sm"
            onClick={resetQuiz}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            {t("common.cancel", "Cancel Quiz")}
          </Button>
        )}
      </div>

      {error && (
        <ErrorState
          compact
          title="Assessment Notice"
          message={error}
          onRetry={activeQuiz && !quizResult ? handleSubmitQuiz : handleStartQuiz}
        />
      )}

      {/* VIEW 1: Quiz Config / Start Screen */}
      {!activeQuiz && !quizResult && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">{t("assessment.generate_quiz", "Generate AI Assessment")}</CardTitle>
              <CardDescription>
                Select reference publication, question volume, and operational difficulty to generate verified questions.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Document Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{t("assessment.select_document", "Source Manual / Guideline")}</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  disabled={docsLoading || documents.length === 0}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-60"
                >
                  {docsLoading ? (
                    <option value="">{t("common.loading", "Loading MoSPI publications...")}</option>
                  ) : documents.length > 0 ? (
                    documents.map((doc) => (
                      <option key={doc.document_id} value={doc.document_id}>
                        {doc.filename}
                      </option>
                    ))
                  ) : (
                    <option value="">No reference publications found</option>
                  )}
                </select>
              </div>

              {/* Question Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{t("assessment.num_questions", "Number of Questions")}</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value={3}>3 Questions (Micro-Check)</option>
                  <option value={5}>5 Questions (Standard Diagnostic)</option>
                  <option value={10}>10 Questions (Comprehensive APAR)</option>
                </select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{t("assessment.difficulty", "Difficulty Level")}</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="easy">{t("assessment.easy", "Foundational")} (Easy)</option>
                  <option value="medium">{t("assessment.medium", "Intermediate")} (Medium)</option>
                  <option value="hard">{t("assessment.hard", "Advanced / Expert")} (Hard)</option>
                </select>
              </div>
            </div>

            {!docsLoading && documents.length === 0 && (
              <EmptyState
                icon={<FolderArchive className="w-6 h-6 text-blue-900" />}
                title={t("assessment.no_active_quiz", "No Assessment Documents Available")}
                description={t("assessment.no_active_quiz_desc", "The assessment engine requires indexed training manuals or operational handbooks to formulate grounded MCQs. Please upload survey manuals in the Learning Repository.")}
              />
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Pass mark is 60%. Successful attempts award gamified XP and update your official digital twin.</span>
              </div>
              <Button
                variant="saffron"
                size="md"
                onClick={handleStartQuiz}
                isLoading={loading}
                disabled={loading || documents.length === 0}
                leftIcon={<Target className="w-4 h-4" />}
              >
                {loading ? t("common.loading", "Generating Safe Questions...") : t("assessment.start_quiz", "Start Assessment")}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* VIEW 2: Active Quiz Questions */}
      {activeQuiz && !quizResult && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">
                  Active Quiz Session: {activeQuiz.total_questions} Questions
                </CardTitle>
                <CardDescription>
                  Reference: {activeQuiz.document_id} • Difficulty: {activeQuiz.difficulty.toUpperCase()}
                </CardDescription>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-900 px-3 py-1 rounded-full">
                {Object.keys(selectedAnswers).length} of {activeQuiz.total_questions} Answered
              </span>
            </CardHeader>
            <CardBody className="space-y-6">
              {activeQuiz.questions.map((q, idx) => {
                const selected = selectedAnswers[q.question_id];
                return (
                  <div
                    key={q.question_id}
                    className="p-5 rounded-xl border border-slate-200 bg-white space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                        Question {idx + 1} of {activeQuiz.total_questions}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Topic: {q.topic || "Statistical Methodology"}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-relaxed">
                      {q.question}
                    </h4>

                    {/* Options (Safe: Correct answer is NOT in payload) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt) => {
                        const isChosen = selected === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectOption(q.question_id, opt.id)}
                            className={`p-3 rounded-lg border text-left text-xs transition-all flex items-start gap-2.5 ${
                              isChosen
                                ? "bg-blue-900 text-white border-blue-900 font-semibold shadow-xs"
                                : "bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-900/40 hover:bg-white"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isChosen ? "bg-white text-blue-900" : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {opt.id}
                            </span>
                            <span className="leading-snug">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">
                    {Object.keys(selectedAnswers).length} of {activeQuiz.questions.length} Questions Answered
                  </span>
                  {Object.keys(selectedAnswers).length === 0 && (
                    <span className="text-amber-600 font-medium">
                      (Select your answer choice above)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button variant="outline" size="md" onClick={resetQuiz}>
                    {t("common.cancel", "Abandon Session")}
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    isLoading={submitting}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {submitting ? t("assessment.submitting", "Evaluating Answers...") : t("assessment.submit_quiz", "Submit Evaluation")}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* VIEW 3: Comprehensive Results Screen */}
      {quizResult && (
        <div className="space-y-6">
          {/* Result Score Banner */}
          <Card variant="accent">
            <CardBody className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        quizResult.percentage >= 60
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {quizResult.percentage >= 60 ? t("assessment.passed", "Competency Standard Achieved") : t("assessment.failed", "Further Review Recommended")}
                    </span>
                    <span className="text-xs text-slate-500">
                      Submitted at {new Date(quizResult.submitted_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {t("assessment.results_title", "Assessment Results & Feedback")}: {quizResult.score} / {quizResult.total_questions} ({quizResult.percentage.toFixed(0)}%)
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    {quizResult.overall_feedback}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button variant="primary" size="md" onClick={resetQuiz} leftIcon={<RotateCcw className="w-4 h-4" />}>
                    {t("assessment.retake_btn", "Retake / New Assessment")}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Detailed Question Evaluations with Explanations */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">{t("assessment.explanation", "Statistical Rationale & Reference")}</CardTitle>
                <CardDescription>
                  Ground truth derived from official manuals with cited chunk locations.
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {quizResult.question_results.map((qr, idx) => (
                <div
                  key={qr.question_id || idx}
                  className={`p-4 rounded-xl border ${
                    qr.is_correct
                      ? "border-green-200 bg-green-50/30"
                      : "border-red-200 bg-red-50/30"
                  } space-y-2.5`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      Question {idx + 1}: {qr.topic}
                    </span>
                    <span
                      className={`flex items-center gap-1 font-bold ${
                        qr.is_correct ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {qr.is_correct ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Correct (+1)
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" /> Incorrect (0)
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800">{qr.question}</p>

                  <div className="text-xs space-y-1">
                    <p className="text-slate-600">
                      <span className="font-bold">Your selection:</span> Option {qr.selected_answer || "Unanswered"}
                    </p>
                    <p className="text-green-800 font-bold">
                      Correct answer: Option {qr.correct_answer}
                    </p>
                  </div>

                  {/* Explanation */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1">
                    <span className="font-bold text-slate-900 block flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-900" /> Grounded Explanation:
                    </span>
                    <p>{qr.explanation}</p>
                    {qr.source?.document && (
                      <span className="text-[10px] text-slate-400 block pt-1">
                        Source: {qr.source.document}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AssessmentView;
