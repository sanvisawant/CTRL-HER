import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Lock,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
  User,
  BadgeCheck,
  Phone,
  Briefcase,
  AlertCircle,
  Globe,
  RefreshCw,
  Sparkles,
  Plus,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { AuthBrandPanel } from "./AuthBrandPanel";
import { useAuth } from "../../context/AuthContext";

const PRESET_SKILLS = [
  "Survey Sampling & Design",
  "Data Quality & Scrutiny",
  "Statistical Analysis & Inference",
  "Data Visualization & Dashboards",
  "Python for Data Science",
  "Field Survey Operations",
  "Index Numbers & Price Statistics",
  "National Accounts & GDP",
  "Public Policy & Decision Making",
  "Econometrics & Forecasting",
  "Time Series Modeling",
  "R-Script & Automation",
];

interface SignupFormInputs {
  fullName: string;
  cadreId: string;
  designation: string;
  role: "learner" | "trainer" | "admin";
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  termsAgreed: boolean;
}

export const Signup = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "largest">("normal");

  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    "Survey Sampling & Design",
    "Data Quality & Scrutiny",
  ]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [skillError, setSkillError] = useState<string | null>(null);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const exists = prev.includes(skill);
      const next = exists ? prev.filter((s) => s !== skill) : [...prev, skill];
      if (next.length > 0) setSkillError(null);
      return next;
    });
  };

  const addCustomSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (selectedSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillError(`"${trimmed}" is already selected.`);
      return;
    }
    setSelectedSkills((prev) => [...prev, trimmed]);
    setCustomSkillInput("");
    setSkillError(null);
  };

  const removeSkill = (skillToRemove: string) => {
    setSelectedSkills((prev) => {
      const next = prev.filter((s) => s !== skillToRemove);
      if (next.length === 0) {
        setSkillError("Please select or add at least one core skill.");
      }
      return next;
    });
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<SignupFormInputs>({
    defaultValues: {
      fullName: "Sanvi Sawant",
      cadreId: "ISS-2024-8921",
      designation: "Senior Statistical Officer (SSO)",
      role: "learner",
      email: "sanvi.sawant@gov.in",
      phone: "",
      password: "",
      confirmPassword: "",
      termsAgreed: false,
    },
  });

  const emailValue = watch("email");
  const passwordValue = watch("password");

  const handleDomainAppend = (domain: string) => {
    const current = emailValue || "";
    if (current.includes("@")) {
      const prefix = current.split("@")[0];
      setValue("email", `${prefix}${domain}`, { shouldValidate: true });
    } else {
      setValue("email", `${current}${domain}`, { shouldValidate: true });
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleContinueToStep2 = async () => {
    const isValid = await trigger([
      "fullName",
      "cadreId",
      "designation",
      "role",
      "email",
      "phone",
      "password",
      "confirmPassword",
    ]);

    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = (data: SignupFormInputs) => {
    if (data.password !== data.confirmPassword) {
      setStep(1);
      return;
    }

    if (selectedSkills.length === 0) {
      setSkillError("Please select or add at least one core skill.");
      return;
    }

    setIsLoading(true);

    loginUser({
      fullName: data.fullName,
      email: data.email,
      designation: data.designation,
      cadreId: data.cadreId,
      role: data.role,
      phone: data.phone,
      declaredSkills: selectedSkills,
      isFirstTimeUser: true,
      hasCompletedBaseline: false,
      verifiedSkillScores: {},
    });

    setTimeout(() => {
      setIsLoading(false);
      navigate("/competency");
    }, 500);
  };

  const fontSizeClass =
    fontSize === "largest" ? "text-lg" : fontSize === "large" ? "text-base" : "text-sm";

  return (
    <div className="h-screen max-h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Official Indian Tricolor National Bar */}
      <div className="gov-tricolor-bar shrink-0" />

      {/* Main Split Portal Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 h-full overflow-hidden">
        {/* Sleek Brand Left Panel (5 cols / ~42-45%) */}
        <AuthBrandPanel mode="signup" />

        {/* RIGHT PANEL: 2-Step Onboarding Form (7 cols / ~55-58%) */}
        <main className="lg:col-span-7 bg-white flex flex-col justify-between p-6 sm:p-8 lg:px-14 lg:py-6 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fade-in">
          <div>
            {/* Top Bar: Accessibility & Multilingual Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
              {/* MoSPI Portal Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>MoSPI Cadre Onboarding Gateway</span>
              </div>

              {/* Utility Widgets (Accessibility & Language) */}
              <div className="flex items-center gap-3">
                {/* Text Size Controls */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setFontSize("normal")}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors ${
                      fontSize === "normal"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                    title={t("common.text_normal", "Normal text size")}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize("large")}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors ${
                      fontSize === "large"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                    title={t("common.text_large", "Large text size")}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize("largest")}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-colors ${
                      fontSize === "largest"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                    title={t("common.text_largest", "Largest text size")}
                  >
                    A+
                  </button>
                </div>

                {/* Multilingual Switcher */}
                <div className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => changeLanguage("en")}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                        i18n.language === "en"
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => changeLanguage("hi")}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                        i18n.language === "hi"
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      हिन्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => changeLanguage("mr")}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-colors ${
                        i18n.language === "mr"
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      मराठी
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-5 gap-6">
              <Link
                to="/login"
                className="pb-2.5 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-800 hover:border-slate-300 flex items-center gap-2 transition-all"
              >
                <span>{t("auth.signin_tab", "Sign In")}</span>
              </Link>
              <button
                type="button"
                className="pb-2.5 font-bold text-sm border-b-2 border-indigo-600 text-indigo-600 flex items-center gap-2 transition-all cursor-default"
              >
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>{t("auth.signup_tab", "Officer Registration")}</span>
              </button>
            </div>

            {/* 2-Step Progress Stepper */}
            <div className="mb-6 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/80">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className={step === 1 ? "text-indigo-700 flex items-center gap-1.5" : "text-emerald-700 flex items-center gap-1.5"}>
                  {step === 1 ? (
                    <>
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">1</span>
                      <span>Step 1: Officer Credentials</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Officer Credentials Verified</span>
                    </>
                  )}
                </span>
                <span className={step === 2 ? "text-indigo-700 flex items-center gap-1.5" : "text-slate-400 flex items-center gap-1.5"}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>2</span>
                  <span>Step 2: Skills & Calibration</span>
                </span>
              </div>
              <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: step === 1 ? "50%" : "100%" }}
                />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* ── STEP 1: OFFICER CREDENTIALS ─────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  {/* Row 1: Cadre Role & Full Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        {t("auth.role_label", "Cadre Role")} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                        </div>
                        <select
                          {...register("role", { required: true })}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all cursor-pointer shadow-2xs"
                        >
                          <option value="learner">{t("auth.role_learner", "Cadre Officer / Investigator (Learner)")}</option>
                          <option value="trainer">{t("auth.role_trainer", "Training Faculty / NASA Faculty (Trainer)")}</option>
                          <option value="admin">{t("auth.role_admin", "System Administrator (Admin)")}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        {t("auth.full_name_label", "Full Name")} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          {...register("fullName", {
                            required: "Full name is required as per service book",
                          })}
                          type="text"
                          placeholder={t("auth.full_name_placeholder", "e.g. Sanvi Sawant")}
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                            errors.fullName ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400" : "border-slate-200 hover:border-slate-300"
                          }`}
                        />
                      </div>
                      {errors.fullName && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.fullName.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Designation & Cadre ID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        {t("auth.designation_label", "Designation / Rank")} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          {...register("designation", {
                            required: "Designation is required",
                          })}
                          type="text"
                          placeholder={t("auth.designation_placeholder", "Senior Statistical Officer (SSO)")}
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                            errors.designation ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400" : "border-slate-200 hover:border-slate-300"
                          }`}
                        />
                      </div>
                      {errors.designation && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.designation.message}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        {t("auth.cadre_id_label", "Cadre ID / Employee Code")} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <BadgeCheck className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          {...register("cadreId", {
                            required: "Cadre ID is required",
                          })}
                          type="text"
                          placeholder={t("auth.cadre_id_placeholder", "ISS-2024-8921")}
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 font-mono placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                            errors.cadreId ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400" : "border-slate-200 hover:border-slate-300"
                          }`}
                        />
                      </div>
                      {errors.cadreId && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.cadreId.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Official Email & Mobile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          {t("auth.email_label", "Official Email")} <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDomainAppend("@gov.in")}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-bold border border-indigo-200/60 transition-colors cursor-pointer"
                          >
                            @gov.in
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDomainAppend("@nic.in")}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-bold border border-indigo-200/60 transition-colors cursor-pointer"
                          >
                            @nic.in
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          {...register("email", {
                            required: t("auth.email_error", "Official email is required"),
                            pattern: {
                              value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                              message: t("auth.email_error", "Please enter a valid email"),
                            },
                          })}
                          type="email"
                          placeholder={t("auth.email_placeholder", "officer.name@gov.in")}
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                            errors.email ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400" : "border-slate-200 hover:border-slate-300"
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.email.message}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        {t("auth.phone_label", "Mobile Number (for 2FA)")} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          {...register("phone", {
                            required: "Mobile number is required for 2FA validation",
                            pattern: {
                              value: /^[6-9]\d{9}$/,
                              message: "Please enter a valid 10-digit mobile number",
                            },
                          })}
                          type="tel"
                          maxLength={10}
                          placeholder={t("auth.phone_placeholder", "9876543210")}
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                            errors.phone ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400" : "border-slate-200 hover:border-slate-300"
                          }`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.phone.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Password & Confirm Password */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        {t("auth.password_label", "Account Password")} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          {...register("password", {
                            required: "Password is required",
                            minLength: {
                              value: 8,
                              message: "Minimum 8 characters required",
                            },
                          })}
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.password_placeholder", "Minimum 8 characters")}
                          className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                            errors.password ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400" : "border-slate-200 hover:border-slate-300"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 focus:outline-none cursor-pointer transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.password.message}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                        {t("auth.confirm_password_label", "Confirm Password")} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                          {...register("confirmPassword", {
                            required: "Please confirm your password",
                            validate: (val) =>
                              val === passwordValue || t("auth.password_mismatch", "Passwords do not match"),
                          })}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={t("auth.confirm_password_placeholder", "Re-enter your password")}
                          className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                            errors.confirmPassword ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400" : "border-slate-200 hover:border-slate-300"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-indigo-600 focus:outline-none cursor-pointer transition-colors"
                          aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.confirmPassword.message}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Continue Button to Step 2 */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleContinueToStep2}
                      className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Continue to Skill Calibration</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: CUSTOMIZE YOUR LEARNING PROFILE (SKILLS) ─────────────── */}
              {step === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        What are your core proficiencies?
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                      Select your active operational strengths to calibrate your baseline competency digital twin.
                    </p>
                  </div>

                  {/* Selected Skills Preview Badges */}
                  <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Selected Skills ({selectedSkills.length})</span>
                      <span className="text-indigo-600 font-medium">Click chip or &times; to remove</span>
                    </div>

                    {selectedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs hover:bg-indigo-100 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="ml-1 text-indigo-400 hover:text-indigo-900 transition-colors cursor-pointer"
                              title="Remove skill"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-rose-600 italic py-1">
                        Please select at least one skill to continue.
                      </p>
                    )}
                  </div>

                  {/* Interactive Skill Chips (Quick Suggestions) */}
                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Quick Suggestions (Click to toggle):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_SKILLS.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02]"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                            }`}
                          >
                            {isSelected ? "✓ " : "+ "}
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Skill Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      Add Other MoSPI Specialized Skill:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customSkillInput}
                        onChange={(e) => setCustomSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomSkill();
                          }
                        }}
                        placeholder="e.g. Econometrics, Big Data, NSS Stratification..."
                        className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomSkill()}
                        className="px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Skill</span>
                      </button>
                    </div>
                    {skillError && (
                      <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{skillError}</span>
                      </p>
                    )}
                  </div>

                  {/* Verification Declaration Checkbox */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        {...register("termsAgreed", {
                          required: t("auth.terms_error", "You must accept the MoSPI information security declaration"),
                        })}
                        type="checkbox"
                        className="w-4 h-4 mt-0.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          "auth.terms_agree",
                          "I declare that the information provided is accurate and corresponds to official service records. I agree to abide by MoSPI digital security guidelines."
                        )}
                      </span>
                    </label>
                    {errors.termsAgreed && (
                      <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.termsAgreed.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Action Footer: Back button + Submit button */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Details</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{t("auth.registering", "Registering Official Profile...")}</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Registration & Enter DAKSHA 🚀</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Switch to Login */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className={`${fontSizeClass} text-slate-500`}>
                {t("auth.has_account", "Already registered with MoSPI Cadre?")}{" "}
                <Link
                  to="/login"
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                >
                  {t("auth.go_login", "Sign In to DAKSHA")} &rarr;
                </Link>
              </p>
            </div>
          </div>

          {/* Clean Portal Footer */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <p>{t("common.copyright", "© 2026 Ministry of Statistics and Programme Implementation")}</p>
            <div className="flex items-center gap-3">
              <a href="#privacy" className="hover:text-indigo-600 transition-colors">
                {t("common.privacy_policy", "Privacy Policy")}
              </a>
              <span>•</span>
              <a href="#terms" className="hover:text-indigo-600 transition-colors">
                {t("common.terms_of_service", "Terms of Use")}
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Signup;
