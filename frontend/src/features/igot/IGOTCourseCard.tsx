import {
  BookOpen,
  Clock,
  Target,
  ArrowUpRight,
} from "lucide-react";

import type { CourseRecommendation } from "./api";

interface IGOTCourseCardProps {
  course: CourseRecommendation;
}

export const IGOTCourseCard = ({
  course,
}: IGOTCourseCardProps) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">

      <div className="flex items-start justify-between gap-4">

        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-900 bg-blue-50 px-2 py-1 rounded">
            <BookOpen className="w-3 h-3" />
            iGOT Karmayogi
          </span>

          <h3 className="text-base font-bold text-slate-900 mt-3">
            {course.title}
          </h3>
        </div>

        <div className="shrink-0 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-bold">
          {Math.round(course.match_percentage)}% Match
        </div>

      </div>

      <p className="text-xs text-slate-600 mt-3 leading-relaxed">
        {course.description}
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        {course.competencies.map((competency) => (
          <span
            key={competency}
            className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium"
          >
            {competency}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5">

        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-900" />

          <div>
            <p className="text-[10px] text-slate-400">
              Difficulty
            </p>

            <p className="text-xs font-semibold text-slate-800">
              {course.difficulty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-700" />

          <div>
            <p className="text-[10px] text-slate-400">
              Duration
            </p>

            <p className="text-xs font-semibold text-slate-800">
              {course.duration_hours} hours
            </p>
          </div>
        </div>

      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">

        <p className="text-[10px] font-bold text-blue-900 uppercase">
          Why this course?
        </p>

        <p className="text-xs text-slate-700 mt-1">
          {course.reason}
        </p>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
        <div>
          <p className="text-[10px] font-bold uppercase text-green-700">Matched competencies</p>
          <p className="mt-1 text-slate-600">
            {course.matched_competencies.length > 0
              ? course.matched_competencies.join(", ")
              : "No direct competency match"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-amber-700">Other identified gaps</p>
          <p className="mt-1 text-slate-600">
            {course.missing_competencies.length > 0
              ? course.missing_competencies.join(", ")
              : "None"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (course.url && course.url !== "#") {
            window.open(course.url, "_blank");
          } else {
            alert(
              "This course will open on iGOT after official API integration."
            );
          }
        }}
        className="w-full mt-5 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-950 transition-colors"
      >
        View Course
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>

    </div>
  );
};