import React, { useEffect, useState } from "react";
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
  FileCheck2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

export const AssessmentView: React.FC = () => {
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
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available documents on mount
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.fetchDocuments();
        if (res.documents && res.documents.length > 0) {
          setDocuments(res.documents);
          setSelectedDocId(res.documents[0].document_id);
        }
      } catch (err: unknown) {
        console.warn("Could not fetch documents for quiz generation:", err);
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
    if (!activeQuiz) return;
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/40 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>P3 Grounded Assessment Engine & P4 Gamification</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            MoSPI Competency Diagnostic & In-Service Evaluation
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Strictly grounded MCQs derived from official ministry manuals. Submissions automatically calibrate your competency profile and award gamified XP.
          </p>
        </div>
        {activeQuiz && !quizResult && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetQuiz}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="border-white/30 text-white hover:bg-white/10"
          >
            Cancel Quiz
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Evaluation Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* VIEW 1: Quiz Config / Start Screen */}
      {!activeQuiz && !quizResult && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">Initiate Diagnostic Assessment</CardTitle>
              <CardDescription>
                Select reference publication, question volume, and operational difficulty to generate verified questions.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Document Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Source Publication</label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  {documents.map((doc) => (
                    <option key={doc.document_id} value={doc.document_id}>
                      {doc.filename}
                    </option>
                  ))}
                  {documents.length === 0 && (
                    <option value="">Default MoSPI Survey Manual</option>
                  )}
                </select>
              </div>

              {/* Question Count */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Question Volume</label>
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
                <label className="text-xs font-bold text-slate-700">Operational Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="easy">Easy — Basic Terminology & Definitions</option>
                  <option value="medium">Medium — Methodological Application</option>
                  <option value="hard">Hard — Advanced Statistical Decision Making</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Pass mark is 60%. Successful attempts award gamified XP and update your official digital twin.</span>
              </div>
              <Button
                variant="saffron"
                size="md"
                onClick={handleStartQuiz}
                disabled={loading}
                leftIcon={<Target className="w-4 h-4" />}
              >
                {loading ? "Generating Safe Questions..." : "Begin Assessment"}
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

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button variant="outline" size="md" onClick={resetQuiz}>
                  Abandon Session
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {submitting ? "Evaluating Answers..." : "Submit for Official Evaluation"}
                </Button>
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
                      {quizResult.percentage >= 60 ? "PASSED" : "NEEDS REVIEW"}
                    </span>
                    <span className="text-xs text-slate-500">
                      Submitted at {new Date(quizResult.submitted_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    Evaluation Result: {quizResult.score} / {quizResult.total_questions} ({quizResult.percentage.toFixed(0)}%)
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    {quizResult.overall_feedback}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button variant="primary" size="md" onClick={resetQuiz} leftIcon={<RotateCcw className="w-4 h-4" />}>
                    Take Another Quiz
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Detailed Question Evaluations with Explanations */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">Pedagogical Feedback & Correct Rationales</CardTitle>
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
