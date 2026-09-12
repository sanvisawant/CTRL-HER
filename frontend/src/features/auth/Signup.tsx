import { useState } from "react";
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
} from "lucide-react";
import { Button } from "../../components/common/Button";
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
      setSkillError(`"${trimmed}" is already added.`);
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
        setSkillError("Please select or add at least one skill you are good at.");
      }
      return next;
    });
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const onSubmit = (data: SignupFormInputs) => {
    if (data.password !== data.confirmPassword) {
      return;
    }

    if (selectedSkills.length === 0) {
      setSkillError("Please select or add at least one skill you are good at.");
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
        {/* Animated DAKSHA Brand Panel */}
        <AuthBrandPanel mode="signup" />

        {/* RIGHT PANEL: Direct, Streamlined Signup Form (7 cols) */}
        <main className="lg:col-span-7 bg-white flex flex-col justify-between p-4 sm:p-6 lg:px-12 lg:py-5 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fade-in">
          <div className="flex flex-col">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-3 border-b border-slate-200">
              {/* Accessibility */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
                  {t("common.text_size")}:
                </span>
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setFontSize("normal")}
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      fontSize === "normal"
                        ? "bg-blue-900 text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                    title={t("common.text_normal")}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize("large")}
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      fontSize === "large"
                        ? "bg-blue-900 text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                    title={t("common.text_large")}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize("largest")}
                    className={`px-2 py-1 text-xs font-bold rounded ${
                      fontSize === "largest"
                        ? "bg-blue-900 text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                    title={t("common.text_largest")}
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Multilingual Selector */}
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-slate-500" />
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => changeLanguage("en")}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      i18n.language === "en"
                        ? "bg-blue-900 text-white font-semibold shadow-xs"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage("hi")}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      i18n.language === "hi"
                        ? "bg-blue-900 text-white font-semibold shadow-xs"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    हिन्दी
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLanguage("mr")}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      i18n.language === "mr"
                        ? "bg-blue-900 text-white font-semibold shadow-xs"
                        : "text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    मराठी
                  </button>
                </div>
              </div>
            </div>

            {/* Clean Statutory Notice Banner */}
            <div className="mb-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-xs text-amber-900 leading-tight font-medium">
                {t("auth.sec_warning")}
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-3.5 gap-2">
              <Link
                to="/login"
                className="py-1.5 px-3.5 font-medium text-xs sm:text-sm border-b-2 border-transparent text-slate-500 hover:text-blue-900 hover:border-slate-300 flex items-center gap-1.5 transition-all"
              >
                <span>{t("auth.signin_tab")}</span>
              </Link>
              <button
                type="button"
                className="py-1.5 px-3.5 font-bold text-xs sm:text-sm border-b-2 border-blue-900 text-blue-900 flex items-center gap-1.5 transition-all"
              >
                <UserCheck className="w-4 h-4 text-blue-900" />
                <span>{t("auth.signup_tab")}</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-3.5">
              {/* Row 1: Role & Full Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.role_label")} <span className="text-red-600">*</span>
                  </label>
                  <select
                    {...register("role", { required: true })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="learner">{t("auth.role_learner")}</option>
                    <option value="trainer">{t("auth.role_trainer")}</option>
                    <option value="admin">{t("auth.role_admin")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.full_name_label")} <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      {...register("fullName", {
                        required: "Full name is required",
                      })}
                      type="text"
                      placeholder={t("auth.full_name_placeholder")}
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        errors.fullName ? "border-red-500 bg-red-50/20 ring-1 ring-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Designation & Cadre ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.designation_label")} <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <input
                      {...register("designation", {
                        required: "Designation is required",
                      })}
                      type="text"
                      placeholder={t("auth.designation_placeholder")}
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        errors.designation ? "border-red-500 bg-red-50/20 ring-1 ring-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                    />
                  </div>
                  {errors.designation && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {errors.designation.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.cadre_id_label")} <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                    <input
                      {...register("cadreId", {
                        required: "Cadre ID is required",
                      })}
                      type="text"
                      placeholder={t("auth.cadre_id_placeholder")}
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-800 font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        errors.cadreId ? "border-red-500 bg-red-50/20 ring-1 ring-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                    />
                  </div>
                  {errors.cadreId && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {errors.cadreId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Official Email & Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t("auth.email_label")} <span className="text-red-600">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDomainAppend("@gov.in")}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-blue-900 font-mono font-medium border border-slate-200 transition-colors"
                      >
                        @gov.in
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDomainAppend("@nic.in")}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-blue-900 font-mono font-medium border border-slate-200 transition-colors"
                      >
                        @nic.in
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      {...register("email", {
                        required: t("auth.email_error"),
                        pattern: {
                          value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                          message: t("auth.email_error"),
                        },
                      })}
                      type="email"
                      placeholder={t("auth.email_placeholder")}
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        errors.email ? "border-red-500 bg-red-50/20 ring-1 ring-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.phone_label")} <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      {...register("phone", {
                        required: "Mobile number is required for 2FA",
                        pattern: {
                          value: /^[6-9]\d{9}$/,
                          message: "Please enter a valid 10-digit mobile number",
                        },
                      })}
                      type="tel"
                      maxLength={10}
                      placeholder={t("auth.phone_placeholder")}
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        errors.phone ? "border-red-500 bg-red-50/20 ring-1 ring-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.password_label")} <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
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
                      placeholder={t("auth.password_placeholder")}
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        errors.password ? "border-red-500 bg-red-50/20 ring-1 ring-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-900 focus:outline-none focus:text-blue-900 cursor-pointer transition-colors"
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
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.confirm_password_label")} <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      {...register("confirmPassword", {
                        required: "Please confirm your password",
                        validate: (val) =>
                          val === passwordValue || t("auth.password_mismatch"),
                      })}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t("auth.confirm_password_placeholder")}
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        errors.confirmPassword ? "border-red-500 bg-red-50/20 ring-1 ring-red-500" : "border-slate-300 hover:border-slate-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-900 focus:outline-none focus:text-blue-900 cursor-pointer transition-colors"
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
                    <p className="text-[11px] text-red-600 mt-1 font-medium">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 5: Skills You Are Good At (Self-Declared Competency Focus) */}
              <div className="pt-2 pb-1 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-900 shrink-0" />
                    <label className="text-xs font-bold text-slate-800 tracking-tight">
                      Skills You Are Good At / Core Proficiencies <span className="text-red-600">*</span>
                    </label>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {selectedSkills.length} selected
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Select your current operational strengths. When you first enter DAKSHA, your competency profile starts fresh and prompts you for a baseline diagnostic test on these skills.
                </p>

                {/* Selected Skills Chips */}
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    {selectedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900 text-white shadow-2xs"
                      >
                        <Check className="w-3 h-3 text-blue-200" />
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-0.5 text-blue-300 hover:text-white transition-colors"
                          title="Remove skill"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Preset Suggestions */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Quick Suggestions (Click to add/remove):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_SKILLS.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-900 text-white border-blue-900 shadow-2xs"
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
                <div className="flex items-center gap-2 pt-1">
                  <div className="relative flex-1">
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
                      placeholder="Add custom skill (e.g. Econometrics, Big Data)..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-900 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addCustomSkill()}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {skillError && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {skillError}
                  </p>
                )}
              </div>

              {/* Declaration Checkbox */}
              <div className="pt-1.5 sm:pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    {...register("termsAgreed", {
                      required: t("auth.terms_error"),
                    })}
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 text-blue-900 border-slate-300 rounded focus:ring-blue-900 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    {t("auth.terms_agree")}
                  </span>
                </label>
                {errors.termsAgreed && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">
                    {errors.termsAgreed.message}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
                leftIcon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                className="mt-3 sm:mt-3.5 text-sm sm:text-base font-semibold tracking-wide shadow-sm hover:shadow-md active:scale-[0.99] transition-all py-2.5 sm:py-3 cursor-pointer"
              >
                {isLoading ? t("auth.registering") : t("auth.signup_button")}
              </Button>
            </form>

            {/* Switch to Login */}
            <div className="mt-3.5 sm:mt-4 pt-2.5 border-t border-slate-200 text-center">
              <p className={`${fontSizeClass} text-slate-600`}>
                {t("auth.has_account")}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-900 hover:text-blue-950 hover:underline inline-flex items-center gap-1"
                >
                  {t("auth.go_login")} &rarr;
                </Link>
              </p>
            </div>
          </div>

          {/* Clean Portal Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <p>{t("common.copyright")}</p>
            <div className="flex items-center gap-3 text-xs">
              <a href="#privacy" className="hover:text-blue-900 hover:underline">
                {t("common.privacy_policy")}
              </a>
              <span className="text-slate-300">|</span>
              <a href="#terms" className="hover:text-blue-900 hover:underline">
                {t("common.terms_of_service")}
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
