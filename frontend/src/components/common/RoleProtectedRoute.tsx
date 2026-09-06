import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "./Button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface RoleProtectedRouteProps {
  allowedRoles: ("learner" | "trainer" | "admin")[];
  children: React.ReactNode;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user } = useAuth();

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto border border-red-200">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
              403 Unauthorized Access
            </span>
            <h2 className="text-xl font-black text-slate-900">
              Operational Role Restricted
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              This module requires <strong>{allowedRoles.join(" or ")}</strong> authorization.
              Your current authenticated identity is enrolled as:
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Officer Name:</span>
              <span className="font-semibold text-slate-800">{user.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cadre ID:</span>
              <span className="font-mono font-medium text-slate-800">{user.cadreId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Role:</span>
              <span className="font-bold text-red-700 uppercase">{user.role}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <Link to="/dashboard">
              <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Return to Authorized Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
