import axios from "axios";

// Environment-aware Base URL defaulting to the unified backend port 8000
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// ============================================================================
// Types & Contracts
// ============================================================================

// --- Canonical Identity & Cross-Module Integration Contracts ---
export interface CanonicalIdentity {
  canonical_id: string;
  p1_official_id?: string;
  p2_learner_id?: string;
  p3_learner_id?: string;
  p4_user_id?: string;
  email?: string;
  full_name?: string;
  cadre_id?: string;
  designation?: string;
}

export interface CompetencyGapContract {
  competency_id: number;
  competency_name: string;
  category: string;
  current_score: number;
  benchmark_score: number;
  gap: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  is_critical: boolean;
  p3_topics?: string[];
}

export interface LearningRecommendationContract {
  course_id: string;
  title: string;
  description: string;
  provider: string;
  match_percentage: number;
  matched_competencies: string[];
  target_roles: string[];
  url?: string;
  source: string;
  reason?: string;
}

export interface CourseRecommendation {
  course_id: string;
  title: string;
  description: string;
  competencies: string[];
  difficulty: string;
  duration_hours: number;
  target_roles: string[];
  match_percentage: number;
  matched_competencies: string[];
  missing_competencies: string[];
  reason: string;
  url: string;
}

export interface ConnectedLearnerFlowResponse {
  status: string;
  identity: CanonicalIdentity;
  total_competency_gaps: number;
  competency_gaps: CompetencyGapContract[];
  recommendations: LearningRecommendationContract[];
}

// --- P1: Competencies & Skill Gaps ---
export interface CompetencyItem {
  id: number;
  category: string;
  name: string;
}

export interface CompetenciesGroupedResponse {
  total_competencies: number;
  categories: Record<string, CompetencyItem[]>;
}

export interface RadarDataPoint {
  category: string;
  competency: string;
  current: number;
  required: number;
  gap: number;
}

export interface CategoryRadarPoint {
  category: string;
  current_avg: number;
  required_avg: number;
  gap_avg: number;
}

export interface RadarResponse {
  official_id: string;
  job_role: string;
  competency_radar: RadarDataPoint[];
  category_radar: CategoryRadarPoint[];
}

export interface SkillGapAnalysisResponse {
  official_id: string;
  full_name: string;
  job_role: string;
  benchmark_source: string;
  total_competencies: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  average_gap: number;
  critical_gaps_rationale: string[];
  gaps: CompetencyGapContract[];
}

// --- P2: iGOT Courses ---
export interface IGOTCourse {
  id: string;
  title: string;
  description: string;
  competencies: string[];
  difficulty: string;
  duration_hours: number;
  target_roles: string[];
  provider: string;
  category: string;
  url: string;
}

export interface IGOTCoursesResponse {
  source: string;
  total: number;
  courses: IGOTCourse[];
}

export interface IGOTProgress {
  user_id: string;
  course_id: string;
  progress: number;
  status: string;
}

export interface IGOTProgressResponse {
  source: string;
  user_id: string;
  progress: IGOTProgress[];
}

// --- P3: AI Learning Materials & Semantic Search ---
export interface DocumentItem {
  document_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  file_size_formatted: string;
  uploaded_at: string;
  status: string;
  pages: number;
  text_blocks: number;
  chunks: number;
  embeddings: number;
  description?: string;
}

export interface DocumentListResponse {
  total: number;
  documents: DocumentItem[];
}

export interface SearchResultItem {
  chunk_id: string;
  document_id: string;
  score: number;
  text: string;
  source: string;
  location?: string;
  chunk_index: number;
}

export interface SearchResponse {
  query: string;
  top_k: number;
  total_results: number;
  results: SearchResultItem[];
}

// --- P3: Assessments & Quizzes ---
export interface MCQOption {
  id: "A" | "B" | "C" | "D";
  text: string;
}

export interface MCQSource {
  document_id: string;
  document: string;
  chunk_ids: string[];
  locations: string[];
}

export interface LearnerQuestion {
  question_id: string;
  question: string;
  options: MCQOption[];
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  source: MCQSource;
}

export interface QuizCreateRequest {
  document_id: string;
  topic?: string;
  count?: number;
  difficulty?: "easy" | "medium" | "hard";
  learner_id?: string;
}

export interface QuizResponse {
  quiz_id: string;
  learner_id: string;
  document_id: string;
  topic?: string;
  difficulty: string;
  created_at: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  total_questions: number;
  questions: LearnerQuestion[];
}

export interface SingleAnswerSubmission {
  question_id: string;
  selected_answer?: "A" | "B" | "C" | "D" | null;
}

export interface QuestionEvaluationResult {
  question_id: string;
  question: string;
  options: MCQOption[];
  selected_answer?: string | null;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  difficulty: string;
  topic: string;
  source: MCQSource;
}

export interface TopicPerformance {
  topic: string;
  questions: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
}

export interface QuizResult {
  quiz_id: string;
  learner_id: string;
  document_id: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  score: number;
  percentage: number;
  question_results: QuestionEvaluationResult[];
  topic_performance: TopicPerformance[];
  strongest_topic?: string | null;
  weakest_topic?: string | null;
  overall_feedback: string;
  submitted_at: string;
}

// --- P3: AI Learning Assistant ---
export interface LearningAssistantSource {
  document_id: string;
  document: string;
  chunk_id: string;
  location?: string | null;
}

export interface LearningAssistantResponse {
  status: "ANSWERED" | "INSUFFICIENT_CONTEXT" | "NO_INDEX";
  question: string;
  answer: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sources: LearningAssistantSource[];
}

// --- P4: Admin Workforce Analytics & Heatmap ---
export interface AdminOverviewKPIs {
  total_officials: number;
  average_competency?: number;
  average_competency_score?: number;
  critical_skill_gaps_count?: number;
  critical_gap_count?: number;
  training_completion_rate_pct?: number;
  learning_completion_rate?: number;
  active_learners_count?: number;
  total_courses_completed?: number;
}

export interface DepartmentSummaryItem {
  department_id?: string;
  department_code?: string;
  department_name?: string;
  department?: string;
  total_officials?: number;
  officials?: number;
  average_competency?: number;
  average_score?: number;
  critical_gaps_count?: number;
  critical_gaps?: number;
  training_completion_pct?: number;
  completion_pct?: number;
  top_strengths?: string[];
  top_critical_gaps?: string[];
}

export interface DomainBreakdownItem {
  domain: string;
  average_score: number;
  required_benchmark: number;
  officials_assessed: number;
  critical_count: number;
}

export interface AdminDashboardData {
  kpis: AdminOverviewKPIs;
  domain_breakdown: DomainBreakdownItem[] | Record<string, number>;
  score_distribution?: Record<string, number> | null;
  distribution?: { level_range: string; count: number; percentage: number }[];
  department_summary: DepartmentSummaryItem[];
  training_effectiveness_summary?: {
    overall_average_improvement_pct: number;
    total_officials_trained: number;
    summary_insight: string;
  };
}

export interface HeatmapCell {
  department: string;
  competency_code: string;
  competency_name: string;
  domain: string;
  average_score: number;
  status: "CRITICAL" | "MODERATE" | "PROFICIENT";
}

export interface HeatmapMatrixResponse {
  departments: string[];
  competencies: { code: string; name: string; domain: string }[];
  matrix: HeatmapCell[];
}

// --- Question Bank (Trainer & Assessment Governance) ---
export interface QuestionBankItem {
  question_id: string;
  question: string;
  options: MCQOption[];
  correct_answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  source: MCQSource;
  status: "DRAFT" | "REVIEW" | "APPROVED" | "REJECTED";
  origin: "GENERATED" | "MANUAL";
  created_at: string;
  updated_at?: string;
  reviewed_at?: string;
  reviewed_by?: string | null;
}

export interface QuestionBankListResponse {
  total: number;
  items: QuestionBankItem[];
}

// --- P4: Gamification & Quest ---
export interface ChallengeOption {
  id: string;
  text: string;
}

export interface QuestHomeData {
  user_id: string;
  level: number;
  xp: number;
  xp_for_next_level: number;
  streak_days: number;
  daily_challenge_available: boolean;
  daily_challenge_id?: string;
  active_missions: {
    id: string;
    title: string;
    description: string;
    xp_reward: number;
    completed: boolean;
  }[];
  unlocked_badges: {
    id: string;
    title: string;
    icon: string;
    description: string;
    earned_at: string;
  }[];
}

export interface QuestSubmissionRequest {
  challenge_id: string;
  user_id?: string;
  answers?: any;
  selected_answer?: string;
  challenge_type?: string;
}

export interface QuestSubmissionResponse {
  challenge_id: string;
  is_correct: boolean;
  score_pct: number;
  success?: boolean;
  xp_earned?: number;
  xp_awarded?: number;
  new_total_xp: number;
  new_level: number;
  level_up?: boolean;
  streak_days: number;
  streak_increased?: boolean;
  detailed_feedback?: string;
  explanation?: string;
  unlocked_achievements?: string[];
}

// ============================================================================
// API Service Methods
// ============================================================================

export const api = {
  // ── 1. Cross-Module Integration ───────────────────────────────────────────
  async getConnectedLearnerFlow(cadreId: string): Promise<ConnectedLearnerFlowResponse> {
    const response = await apiClient.get<ConnectedLearnerFlowResponse>(
      `/api/v1/integration/learner-flow/${encodeURIComponent(cadreId)}`
    );
    return response.data;
  },

  async getIntegratedRecommendations(
    cadreId: string,
    limit: number = 5
  ): Promise<LearningRecommendationContract[]> {
    const response = await apiClient.get<LearningRecommendationContract[]>(
      `/api/v1/integration/recommendations/${encodeURIComponent(cadreId)}`,
      { params: { limit } }
    );
    return response.data;
  },

  async getLearningContext(
    cadreId: string,
    competencyId: string | number
  ): Promise<{
    competency_id: number;
    competency_name: string;
    canonical_topics: string[];
    context_found: boolean;
  }> {
    const response = await apiClient.get(
      `/api/v1/integration/learning-context/${encodeURIComponent(cadreId)}/${competencyId}`
    );
    return response.data;
  },

  // ── 2. P1 Competencies & Skill Gaps ───────────────────────────────────────
  async getCompetencies(): Promise<CompetenciesGroupedResponse> {
    const response = await apiClient.get<CompetenciesGroupedResponse>("/api/v1/competencies");
    return response.data;
  },

  async getSkillGaps(officialId: string): Promise<SkillGapAnalysisResponse> {
    const response = await apiClient.get<SkillGapAnalysisResponse>(
      `/api/v1/competency/gaps/${encodeURIComponent(officialId)}`
    );
    return response.data;
  },

  async getRadarData(officialId: string): Promise<RadarResponse> {
    const response = await apiClient.get<RadarResponse>(
      `/api/v1/competency/radar/${encodeURIComponent(officialId)}`
    );
    return response.data;
  },

  // ── 3. P2 iGOT Courses & Progress ─────────────────────────────────────────
  async getIGOTCourses(): Promise<IGOTCoursesResponse> {
    const response = await apiClient.get<IGOTCoursesResponse>("/api/igot/courses");
    return response.data;
  },

  async getIGOTProgress(userId: string): Promise<IGOTProgressResponse> {
    const response = await apiClient.get<IGOTProgressResponse>(
      `/api/igot/users/${encodeURIComponent(userId)}/progress`
    );
    return response.data;
  },

  // ── 4. P3 Learning Documents & Search ─────────────────────────────────────
  async fetchDocuments(): Promise<DocumentListResponse> {
    const response = await apiClient.get<DocumentListResponse>("/api/documents");
    return response.data;
  },

  async uploadDocument(file: File): Promise<{ success: boolean; message: string; data: DocumentItem }> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<{ success: boolean; message: string; data: DocumentItem }>(
      "/api/documents/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  async embedDocument(documentId: string): Promise<{ document_id: string; status: string; chunks_embedded: number }> {
    const response = await apiClient.post<{ document_id: string; status: string; chunks_embedded: number }>(
      `/api/documents/${encodeURIComponent(documentId)}/embed`
    );
    return response.data;
  },

  async indexDocument(documentId: string): Promise<{ document_id: string; status: string; chunks_indexed: number }> {
    const response = await apiClient.post<{ document_id: string; status: string; chunks_indexed: number }>(
      `/api/documents/${encodeURIComponent(documentId)}/index`
    );
    return response.data;
  },

  async semanticSearch(query: string, topK: number = 5): Promise<SearchResponse> {
    const response = await apiClient.post<SearchResponse>("/api/search", {
      query,
      top_k: topK,
    });
    return response.data;
  },

  // ── 5. P3 Grounded Assessment & Quizzes ───────────────────────────────────
  async createQuiz(request: QuizCreateRequest): Promise<QuizResponse> {
    const response = await apiClient.post<QuizResponse>("/api/assessment/quizzes", request);
    return response.data;
  },

  async getQuiz(quizId: string): Promise<QuizResponse> {
    const response = await apiClient.get<QuizResponse>(`/api/assessment/quizzes/${quizId}`);
    return response.data;
  },

  async submitQuiz(quizId: string, answers: SingleAnswerSubmission[]): Promise<QuizResult> {
    const response = await apiClient.post<QuizResult>(
      `/api/assessment/quizzes/${quizId}/submit`,
      { answers }
    );
    return response.data;
  },

  // Question Bank Management (Trainer & Subject Matter Governance)
  async getQuestionBank(status?: string, topic?: string): Promise<QuestionBankListResponse> {
    const response = await apiClient.get<QuestionBankListResponse>(
      "/api/assessment/question-bank",
      { params: { status, topic } }
    );
    return response.data;
  },

  async approveQuestion(questionId: string): Promise<QuestionBankItem> {
    const response = await apiClient.post<QuestionBankItem>(
      `/api/assessment/question-bank/${encodeURIComponent(questionId)}/approve`
    );
    return response.data;
  },

  async rejectQuestion(questionId: string): Promise<QuestionBankItem> {
    const response = await apiClient.post<QuestionBankItem>(
      `/api/assessment/question-bank/${encodeURIComponent(questionId)}/reject`
    );
    return response.data;
  },

  // ── 6. P3 Grounded AI Learning Assistant ─────────────────────────────────
  async askLearningAssistant(
    question: string,
    documentId?: string,
    topK: number = 4
  ): Promise<LearningAssistantResponse> {
    const response = await apiClient.post<LearningAssistantResponse>(
      "/api/learning-assistant/ask",
      {
        question,
        document_id: documentId,
        top_k: topK,
      }
    );
    return response.data;
  },

  // ── 7. P4 Admin Workforce Analytics ───────────────────────────────────────
  async getAdminDashboard(): Promise<AdminDashboardData> {
    const response = await apiClient.get<{ success: boolean; data: AdminDashboardData }>(
      "/api/v1/admin/dashboard",
      { headers: { "X-User-Role": "admin" } }
    );
    return response.data.data;
  },

  async getWorkforceHeatmap(
    domain?: string,
    department?: string
  ): Promise<HeatmapMatrixResponse> {
    const response = await apiClient.get<{ success: boolean; data: HeatmapMatrixResponse }>(
      "/api/v1/admin/heatmap",
      {
        params: { domain, department },
        headers: { "X-User-Role": "admin" },
      }
    );
    return response.data.data;
  },

  // ── 8. P4 Gamification / Quest ───────────────────────────────────────────
  async getQuestHome(userId?: string): Promise<QuestHomeData> {
    const response = await apiClient.get<{ success: boolean; data: QuestHomeData }>(
      "/api/v1/quest/home",
      {
        headers: userId ? { "X-User-Id": userId } : undefined,
      }
    );
    return response.data.data;
  },

  async submitQuestChallenge(
    submission: QuestSubmissionRequest
  ): Promise<QuestSubmissionResponse> {
    const payload = {
      challenge_id: submission.challenge_id || "qst_daily_01",
      user_id: submission.user_id,
      answers: submission.answers !== undefined ? submission.answers : submission.selected_answer,
    };
    const response = await apiClient.post<{ success: boolean; data: QuestSubmissionResponse }>(
      "/api/v1/quest/submit",
      payload,
      {
        headers: submission.user_id ? { "X-User-Id": submission.user_id } : undefined,
      }
    );
    const data = response.data.data;
    data.xp_awarded = data.xp_earned ?? data.xp_awarded ?? 50;
    data.explanation = data.detailed_feedback ?? data.explanation ?? "Challenge evaluated successfully.";
    return data;
  },
};

export default api;
