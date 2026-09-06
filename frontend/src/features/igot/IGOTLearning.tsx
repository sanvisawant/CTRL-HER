import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  Clock,
  BookOpen,
  Info,
} from "lucide-react";

import {
  api,
  type IGOTCourse,
  type IGOTProgress,
  type CourseRecommendation,
} from "../../services/api";

import { SkillGapPanel } from "./SkillGapPanel";
import { IGOTCourseCard } from "./IGOTCourseCard";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { CardSkeleton } from "../../components/common/SkeletonLoader";

export const IGOTLearning = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<IGOTCourse[]>([]);
  const [progress, setProgress] = useState<IGOTProgress[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [skillGaps, setSkillGaps] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partialWarning, setPartialWarning] = useState("");

  const learnerId = user?.cadreId || "ISS-2024-8921";

  const loadIGOTData = async () => {
    if (!learnerId) {
      setError("Learner profile is not available.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setPartialWarning("");

      const [coursesResponse, progressResponse, flowResponse] = await Promise.allSettled([
        api.getIGOTCourses(),
        api.getIGOTProgress(learnerId),
        api.getConnectedLearnerFlow(learnerId),
      ]);

      const coursesOk = coursesResponse.status === "fulfilled";
      const flowOk = flowResponse.status === "fulfilled";

      if (coursesOk) {
        setCourses(coursesResponse.value.courses || []);
      }

      if (progressResponse.status === "fulfilled") {
        setProgress(progressResponse.value.progress || []);
      }

      if (flowOk) {
        const flow = flowResponse.value;
        const gaps = flow.competency_gaps?.map((g) => g.competency_name) || [];
        setSkillGaps(gaps.slice(0, 6));

        // Map flow recommendations safely to CourseRecommendation format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recs: CourseRecommendation[] = (flow.recommendations || []).map((r: any) => {
          const compList: string[] = Array.isArray(r.matched_competencies) && r.matched_competencies.length > 0
            ? r.matched_competencies
            : r.competency_name
            ? [r.competency_name]
            : ["Statistical Core"];

          return {
            course_id: r.course_id || "IG001",
            title: r.course_title || r.title || "Official Capacity Building Course",
            description: r.description || "Grounded learning pathway tailored to official MoSPI cadre benchmarks.",
            competencies: compList,
            difficulty: "Intermediate",
            duration_hours: 12,
            target_roles: r.target_roles || ["Statistical Officer"],
            match_percentage: r.match_percentage || 85,
            matched_competencies: compList,
            missing_competencies: [],
            reason: r.reason || `Directly targets identified gap in ${compList.join(", ")}`,
            url: r.url || "#",
          };
        });
        setRecommendations(recs);
      }

      // Graceful degradation logic
      if (!coursesOk && !flowOk) {
        setError("Unable to connect to the iGOT learning service. Please check that the backend is running.");
      } else if (!coursesOk && flowOk) {
        setPartialWarning("iGOT Course Catalog service is temporarily unreachable. Displaying personalized competency pathway recommendations.");
      } else if (coursesOk && !flowOk) {
        setPartialWarning("Connected Learner Flow service is temporarily unreachable. Displaying available official iGOT course catalog.");
      }
    } catch (err) {
      console.error("iGOT loading error:", err);
      setError("Unable to connect to the iGOT learning service. Please check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIGOTData();
  }, [learnerId]);

  const getProgress = (courseId: string) => {
    return progress.find((item) => item.course_id === courseId);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-48 skeleton-shimmer rounded-lg" />
            <div className="h-3 w-72 skeleton-shimmer rounded-lg" />
          </div>
          <div className="h-8 w-28 skeleton-shimmer rounded-lg" />
        </div>
        <CardSkeleton lines={3} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="iGOT Learning Service Unavailable"
        message={error}
        onRetry={loadIGOTData}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-teal-700">
                Capacity Building
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                iGOT Karmayogi Personalized Learning
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 max-w-2xl">
            Training recommendations mapped dynamically from your P1 competency gaps to the national capacity building catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[10px] font-bold text-blue-800">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            iGOT Adapter (Mock Service)
          </span>
          <button
            type="button"
            onClick={loadIGOTData}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Partial Degradation Warning Banner if one service failed */}
      {partialWarning && (
        <ErrorState
          compact
          title="Partial Service Notice"
          message={partialWarning}
          onRetry={loadIGOTData}
        />
      )}

      {/* Prototype / Mock Integration Disclaimer Banner */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-700 shrink-0" />
        <span>
          <strong>iGOT learning recommendation — prototype/mock integration:</strong> Courses and enrollments are simulated via the MoSPI mock iGOT adapter for the SIH 2026 prototype demonstration.
        </span>
      </div>

      {/* Skill Gaps */}
      <SkillGapPanel skillGaps={skillGaps} />

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-900" />
              <h2 className="text-sm font-bold text-slate-900">
                My iGOT Learning Progress
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active enrollments from the connected iGOT repository
            </p>
          </div>
          <span className="text-[10px] font-semibold text-slate-500">
            {progress.length} courses
          </span>
        </div>

        {progress.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6 text-slate-400" />}
            title="No Active Enrollments"
            description="You are not currently enrolled in any iGOT training courses. Select a course below to begin."
          />
        ) : (
          <div className="space-y-5">
            {progress.map((item) => {
              const course = courses.find((courseItem) => courseItem.id === item.course_id);
              return (
                <div key={item.course_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {item.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                      <span className="text-xs font-bold text-slate-800">
                        {course?.title || item.course_id}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-900">
                      {item.progress}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-900 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">
                    {item.status.replace("_", " ")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <section>
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider font-bold text-teal-700">
            P2 Recommendation Engine
          </p>
          <h2 className="text-lg font-bold text-slate-900">
            Recommended Training Pathways
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Courses matched dynamically according to your P1 competency gaps.
          </p>
        </div>

        {recommendations.length === 0 ? (
          <EmptyState
            title="No Matched Recommendations"
            description="No courses currently match your active competency gaps, or all identified gaps are fulfilled."
            actionText="Audit Competency Gaps"
            onAction={() => window.location.assign("/competency")}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {recommendations.map((course) => (
              <IGOTCourseCard key={course.course_id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* Catalogue */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            iGOT Course Catalogue
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Available training programmes from the connected iGOT repository.
          </p>
        </div>

        {courses.length === 0 ? (
          <EmptyState
            title="Catalogue Empty"
            description="No courses currently registered in the mock iGOT catalog."
            actionText="Refresh Catalogue"
            onAction={loadIGOTData}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => {
            const courseProgress = getProgress(course.id);
            return (
              <div
                key={course.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-blue-900">
                    {course.category}
                  </span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-semibold text-slate-600">
                    {course.difficulty}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">
                  {course.title}
                </h3>

                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {course.description}
                </p>

                <div className="flex items-center gap-3 mt-4">
                  <span className="text-[10px] text-slate-500">
                    {course.duration_hours} hours
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {course.target_roles.length} target roles
                  </span>
                </div>

                {courseProgress && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Your Progress</span>
                      <span className="font-bold text-blue-900">
                        {courseProgress.progress}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full">
                      <div
                        className="h-full bg-blue-900 rounded-full"
                        style={{ width: `${courseProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (course.url && course.url !== "#") {
                      window.open(course.url, "_blank");
                    } else {
                      alert("Official iGOT course URL will be connected after API integration.");
                    }
                  }}
                  className="w-full mt-4 px-3 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-semibold hover:bg-slate-800 transition-colors"
                >
                  View Course
                </button>
              </div>
            );
          })}
        </div>
      )}
      </section>
    </div>
  );
};

export default IGOTLearning;