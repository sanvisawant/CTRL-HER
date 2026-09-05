import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "accent" | "subtle" | "navy";
  className?: string;
}

export const Card = ({
  children,
  variant = "default",
  className = "",
  ...props
}: CardProps) => {
  const variantStyles = {
    default: "bg-white border border-slate-200 shadow-xs",
    elevated: "bg-white border border-slate-200/80 shadow-md shadow-slate-200/50",
    accent: "bg-white border-t-4 border-t-blue-900 border-x border-b border-slate-200 shadow-sm",
    subtle: "bg-slate-50/80 border border-slate-200/80 shadow-none",
    navy: "bg-slate-900 border border-slate-800 text-white shadow-lg",
  };

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <h3 className={`font-semibold text-slate-900 tracking-tight ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <p className={`text-xs text-slate-500 mt-0.5 leading-relaxed ${className}`}>
    {children}
  </p>
);

export const CardBody = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`p-6 ${className}`}>{children}</div>;

export const CardFooter = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`px-6 py-4 bg-slate-50/50 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-3 ${className}`}>
    {children}
  </div>
);
