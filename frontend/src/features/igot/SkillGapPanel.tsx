import {
  Target,
  AlertTriangle,
} from "lucide-react";

interface SkillGapPanelProps {
  skillGaps: string[];
}

export const SkillGapPanel = ({
  skillGaps,
}: SkillGapPanelProps) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-900" />

            <h2 className="text-base font-bold text-slate-900">
              Identified Competency Gaps
            </h2>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            Competencies identified from your learning profile
            that require further development.
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
          AI Identified
        </span>
      </div>

      {skillGaps.length === 0 ? (
        <div className="mt-5 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-green-700 text-sm">
            No major competency gaps identified.
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mt-5">
          {skillGaps.map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-full text-xs font-semibold"
            >
              <AlertTriangle className="w-3 h-3" />
              {skill}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};