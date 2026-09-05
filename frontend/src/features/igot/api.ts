import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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

export interface IGOTProgress {
  user_id: string;
  course_id: string;
  progress: number;
  status: string;
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

export interface IGOTCoursesResponse {
  source: string;
  total: number;
  courses: IGOTCourse[];
}

export interface IGOTProgressResponse {
  source: string;
  user_id: string;
  progress: IGOTProgress[];
}

export interface IGOTRecommendationResponse {
  learner_id: string;
  skill_gaps: string[];
  recommendations: CourseRecommendation[];
}

export const getIGOTCourses = async (): Promise<IGOTCoursesResponse> => {
  const response = await api.get<IGOTCoursesResponse>("/igot/courses");
  return response.data;
};

export const getIGOTProgress = async (
  userId: string
): Promise<IGOTProgressResponse> => {
  const response = await api.get<IGOTProgressResponse>(
    `/igot/users/${userId}/progress`
  );

  return response.data;
};

export interface CompetencyGap {
  competency: string;
  accuracy: number;
  status: string;
}

export interface CompetencyGapsResponse {
  learner_id: string;
  source: string;
  skill_gaps: string[];
  gaps: CompetencyGap[];
}
export const getCompetencyGaps = async (
  learnerId: string
): Promise<CompetencyGapsResponse> => {
  const response = await api.get<CompetencyGapsResponse>(
    `/learners/${encodeURIComponent(learnerId)}/competency-gaps`
  );
  return response.data;
};
export const getIGOTRecommendations = async (
  learnerId: string,
  skillGaps: string[],
  role?: string,
  limit: number = 5
): Promise<IGOTRecommendationResponse> => {
  const response = await api.get<IGOTRecommendationResponse>(
    "/igot/recommendations",
    {
      params: {
        learner_id: learnerId,
        skill_gaps: skillGaps.join(","),
        role,
        limit,
      },
    }
  );

  return response.data;
};