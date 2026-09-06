import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Service Notice",
  message = "Unable to complete the request at this time. Please check your network connection or try again.",
  onRetry,
  compact = false,
  className = "",
}) => {
  if (compact) {
    return (
      <div
        role="alert"
        className={`p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{message}</span>
        </div>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3 h-3" />}
            className="shrink-0 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs text-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto mb-3.5 shadow-inner">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-sm mx-auto">
        {message}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
