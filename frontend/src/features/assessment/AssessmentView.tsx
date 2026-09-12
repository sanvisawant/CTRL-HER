import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
  ChevronDown,
  Search,
  Award,
} from "lucide-react";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";

export const AssessmentView: React.FC = () => {
  const { t } = useTranslation();
  const { user, recordSkillAssessment } = useAuth();
  const cadreId = user?.cadreId || "ISS-2024-8921";
  const [searchParams] = useSearchParams();

  // Target skill for evaluation
  const querySkill = searchParams.get("competency") || searchParams.get("skill") || "";
  const [targetSkill, setTargetSkill] = useState<string>(querySkill);

  // Documents for quiz creation
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [docDropdownOpen, setDocDropdownOpen] = useState<boolean>(false);
  const [docSearchQuery, setDocSearchQuery] = useState<string>("");
  const docDropdownRef = useRef<HTMLDivElement>(null);

  // Sync target skill with searchParams or user declared skills
  useEffect(() => {
    const param = searchParams.get("competency") || searchParams.get("skill");
    if (param) {
      setTargetSkill(param);
    } else if (user?.declaredSkills && user.declaredSkills.length > 0 && !targetSkill) {
      setTargetSkill(user.declaredSkills[0]);
    }
  }, [searchParams, user]);

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

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (docDropdownRef.current && !docDropdownRef.current.contains(event.target as Node)) {
        setDocDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDocDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
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
        topic: targetSkill || undefined,
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

      // Record verified skill score into officer's profile
      const computedScore = (result.percentage / 100) * 4.0;
      const evaluatedSkill = targetSkill || activeQuiz.topic || activeQuiz.questions[0]?.topic || "Core Statistical Competency";
      recordSkillAssessment(
        evaluatedSkill,
        computedScore,
        result.percentage,
        result.total_questions,
        result.correct_answers
      );
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
    <div className="space-y-4 animate-fade-in pb-32">
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
            {/* Target Skill Input & Quick Selection */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-xl space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-blue-900 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">
                    Skill Being Evaluated (Diagnostic Target)
                  </span>
                  {targetSkill && (
                    <span className="text-[10px] font-semibold bg-blue-900 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                {targetSkill && (
                  <button
                    type="button"
                    onClick={() => setTargetSkill("")}
                    className="text-[11px] text-slate-500 hover:text-slate-800 self-start sm:self-auto font-medium"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Input for target skill */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetSkill}
                  onChange={(e) => setTargetSkill(e.target.value)}
                  placeholder="Enter skill to test (e.g. Survey Sampling, Data Quality, Python)..."
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              {/* Declared Skills from Registration */}
              {user?.declaredSkills && user.declaredSkills.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Your Declared Registration Skills (Click to target for test):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.declaredSkills.map((skill) => {
                      const isTarget = targetSkill.toLowerCase() === skill.toLowerCase();
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => setTargetSkill(skill)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                            isTarget
                              ? "bg-blue-900 text-white shadow-2xs ring-1 ring-blue-900"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                          }`}
                        >
                          {isTarget ? "🎯 " : ""}{skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Document Selection with downward opening menu */}
              <div className="space-y-1.5 relative" ref={docDropdownRef}>
                <label className="text-xs font-bold text-slate-700">{t("assessment.select_document", "Source Manual / Guideline")}</label>
                <button
                  type="button"
                  disabled={docsLoading || documents.length === 0}
                  onClick={() => setDocDropdownOpen((prev) => !prev)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-60 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/70 transition-colors"
                  aria-haspopup="listbox"
                  aria-expanded={docDropdownOpen}
                >
                  <span className="truncate mr-2 font-medium">
                    {docsLoading
                      ? t("common.loading", "Loading MoSPI publications...")
                      : documents.find((d) => d.document_id === selectedDocId)?.filename ||
                      (documents.length > 0 ? "Select reference publication..." : "No reference publications found")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${docDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {/* Downward opening dropdown menu */}
                {docDropdownOpen && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-fade-in"
                  >
                    {documents.length > 5 && (
                      <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={docSearchQuery}
                            onChange={(e) => setDocSearchQuery(e.target.value)}
                            placeholder="Filter documents..."
                            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {documents
                        .filter((doc) =>
                          doc.filename.toLowerCase().includes(docSearchQuery.toLowerCase())
                        )
                        .map((doc) => {
                          const isSelected = doc.document_id === selectedDocId;
                          return (
                            <div
                              key={doc.document_id}
                              onClick={() => {
                                setSelectedDocId(doc.document_id);
                                setDocDropdownOpen(false);
                                setDocSearchQuery("");
                              }}
                              className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${isSelected
                                  ? "bg-blue-50 text-blue-950 font-bold"
                                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                                }`}
                              title={doc.filename}
                            >
                              <span className="truncate mr-2">{doc.filename}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      {documents.filter((doc) =>
                        doc.filename.toLowerCase().includes(docSearchQuery.toLowerCase())
                      ).length === 0 && (
                          <div className="px-3 py-3 text-xs text-slate-400 text-center">
                            No matching publications found
                          </div>
                        )}
                    </div>
                  </div>
                )}
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
                            className={`p-3 rounded-lg border text-left text-xs transition-all flex items-start gap-2.5 ${isChosen
                                ? "bg-blue-900 text-white border-blue-900 font-semibold shadow-xs"
                                : "bg-slate-50 text-slate-800 border-slate-200 hover:border-blue-900/40 hover:bg-white"
                              }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isChosen ? "bg-white text-blue-900" : "bg-slate-200 text-slate-700"
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
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${quizResult.percentage >= 60
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
                  <div className="pt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Score: {((quizResult.percentage / 100) * 4.0).toFixed(1)} / 4.0 recorded in Competency Digital Twin
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <Link
                    to="/competency"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Award className="w-4 h-4" />
                    <span>View My Simplified Competency Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Button variant="outline" size="md" onClick={resetQuiz} leftIcon={<RotateCcw className="w-4 h-4" />}>
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
                  className={`p-4 rounded-xl border ${qr.is_correct
                      ? "border-green-200 bg-green-50/30"
                      : "border-red-200 bg-red-50/30"
                    } space-y-2.5`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      Question {idx + 1}: {qr.topic}
                    </span>
                    <span
                      className={`flex items-center gap-1 font-bold ${qr.is_correct ? "text-green-700" : "text-red-700"
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
