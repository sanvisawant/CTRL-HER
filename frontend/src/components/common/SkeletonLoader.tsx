import React from "react";

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`skeleton-shimmer rounded-lg ${className}`} />
);

export const MetricSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  const single = (
    <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonBox className="h-7 w-20" />
      <SkeletonBox className="h-3 w-32" />
    </div>
  );

  if (count > 1) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-3 w-24" />
              <SkeletonBox className="h-8 w-8 rounded-lg" />
            </div>
            <SkeletonBox className="h-7 w-20" />
            <SkeletonBox className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return single;
};

export const CardSkeleton: React.FC<{
  lines?: number;
  rows?: number;
  className?: string;
}> = ({ lines, rows = 3, className = "" }) => {
  const lineCount = lines ?? rows;
  return (
    <div className={`p-5 bg-white border border-slate-200 rounded-xl space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <SkeletonBox className="h-4 w-40" />
        <SkeletonBox className="h-4 w-16" />
      </div>
      {Array.from({ length: lineCount }).map((_, i) => (
        <SkeletonBox key={i} className={`h-3 ${i === lineCount - 1 ? "w-3/5" : "w-full"}`} />
      ))}
    </div>
  );
};
