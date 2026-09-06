import React from "react";
import type { ReactNode } from "react";
import { FolderSearch } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
  className = "",
}) => {
  return (
    <div
      className={`p-8 sm:p-10 bg-slate-50/60 border border-dashed border-slate-200 rounded-2xl text-center max-w-md mx-auto my-4 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
        {icon || <FolderSearch className="w-6 h-6 text-slate-400" />}
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
        {description}
      </p>
      {actionText && onAction && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAction}
            leftIcon={actionIcon}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
