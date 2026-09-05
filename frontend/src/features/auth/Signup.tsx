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
  Sparkles,
  Shield,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";

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
  const [isHighContrast, setIsHighContrast] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormInputs>({
    defaultValues: {
      fullName: "Keiyona Rodrigues",
      cadreId: "ISS-2024-8921",
      designation: "Senior Statistical Officer (SSO)",
      role: "learner",
      email: "keiyona.rodrigues@gov.in",
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

    setIsLoading(true);

    loginUser({
      fullName: data.fullName,
      email: data.email,
      designation: data.designation,
      cadreId: data.cadreId,
      role: data.role,
      phone: data.phone,
    });

    setTimeout(() => {
      setIsLoading(false);
      navigate("/dashboard");
    }, 500);
  };

  const fontSizeClass =
    fontSize === "largest" ? "text-lg" : fontSize === "large" ? "text-base" : "text-sm";

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-100 ${
        isHighContrast ? "high-contrast" : ""
      }`}
    >
      {/* Official Indian Tricolor National Bar */}
      <div className="gov-tricolor-bar" />

      {/* Main Split Portal Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-4px)]">
        {/* LEFT PANEL: Minimalist Institutional Crest & Branding (5 cols) */}
        <div className="lg:col-span-5 gov-security-grid p-8 lg:p-14 text-white flex flex-col justify-between relative overflow-hidden border-r border-slate-800">
          <div className="relative z-10 space-y-8 my-auto">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-800/80">
              <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 p-2 flex items-center justify-center backdrop-blur-xs shadow-inner shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  className="w-10 h-10 text-amber-400 fill-current"
                  aria-hidden="true"
                >
                  <path d="M12 2L15 8H9L12 2Z" />
                  <path d="M5 9C5 9 6 12 7 13C8 14 10 14 10 14L8 16L9 18L12 17L15 18L16 16L14 14C14 14 16 14 17 13C18 12 19 9 19 9H5Z" />
                  <path d="M8 19H16V21C16 21.5 15.5 22 15 22H9C8.5 22 8 21.5 8 21V19Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-amber-400">
                  {t("gov_india")}
                </p>
                <p className="text-xs font-semibold text-slate-200 leading-tight mt-0.5">
                  {t("ministry")}
                </p>
              </div>
            </div>

            {/* Platform Branding */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>{t("auth.officer_onboarding")}</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
                {t("brand")}
              </h1>
              <p className="text-sm text-slate-300 mt-2.5 font-normal leading-relaxed max-w-md">
                {t("tagline")}
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-400 leading-relaxed border-l-2 border-amber-400/80 pl-3">
              Official registration for MoSPI and affiliated cadre personnel. All submissions are verified against service records.
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-slate-800/80 mt-8 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              {t("auth.trust_badge_1")}
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              {t("auth.trust_badge_2")}
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: Direct, Streamlined Signup Form (7 cols) */}
        <div className="lg:col-span-7 bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto">
          <div>
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-200">
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

                <button
                  type="button"
                  onClick={() => setIsHighContrast(!isHighContrast)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    isHighContrast
                      ? "bg-yellow-400 text-black border-yellow-500"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                  title={t("common.high_contrast")}
                >
                  {isHighContrast ? "Normal" : "High Contrast"}
                </button>
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
            <div className="mb-5 p-3 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-xs text-amber-900 leading-tight font-medium">
                {t("auth.sec_warning")}
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <Link
                to="/login"
                className="py-2.5 px-4 font-medium text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
              >
                <span>{t("auth.signin_tab")}</span>
              </Link>
              <button
                type="button"
                className="py-2.5 px-4 font-semibold text-sm border-b-2 border-blue-900 text-blue-900 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t("auth.signup_tab")}</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Row 1: Role & Full Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t("auth.role_label")} <span className="text-red-600">*</span>
                  </label>
                  <select
                    {...register("role", { required: true })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 font-medium focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="learner">{t("auth.role_learner")}</option>
                    <option value="trainer">{t("auth.role_trainer")}</option>
                    <option value="admin">{t("auth.role_admin")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        errors.fullName ? "border-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Designation & Cadre ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        errors.designation ? "border-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                  </div>
                  {errors.designation && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {errors.designation.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 font-mono placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        errors.cadreId ? "border-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                  </div>
                  {errors.cadreId && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {errors.cadreId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 3: Official Email & Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t("auth.email_label")} <span className="text-red-600">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDomainAppend("@gov.in")}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-blue-900 font-mono font-medium border border-slate-200"
                      >
                        @gov.in
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDomainAppend("@nic.in")}
                        className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-blue-900 font-mono font-medium border border-slate-200"
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
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        errors.email ? "border-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        errors.phone ? "border-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 4: Password & Confirm Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        errors.password ? "border-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        errors.confirmPassword ? "border-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Declaration Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    {...register("termsAgreed", {
                      required: t("auth.terms_error"),
                    })}
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 text-blue-900 border-slate-300 rounded focus:ring-blue-900 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    {t("auth.terms_agree")}
                  </span>
                </label>
                {errors.termsAgreed && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
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
                leftIcon={<UserCheck className="w-4 h-4" />}
                className="mt-2 text-sm"
              >
                {isLoading ? t("auth.registering") : t("auth.signup_button")}
              </Button>
            </form>

            {/* Switch to Login */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
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
          <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
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
        </div>
      </div>
    </div>
  );
};
