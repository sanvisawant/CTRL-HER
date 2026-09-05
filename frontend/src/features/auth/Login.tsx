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
  RefreshCw,
  Globe,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";

interface LoginFormInputs {
  email: string;
  password: string;
  role: "learner" | "trainer" | "admin";
  captcha: string;
  rememberMe: boolean;
}

export const Login = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { loginUser, user } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptcha());
  const [captchaError, setCaptchaError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fontSize, setFontSize] = useState<"normal" | "large" | "largest">("normal");
  const [isHighContrast, setIsHighContrast] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    defaultValues: {
      email: user?.email || "keiyona.rodrigues@gov.in",
      password: "",
      role: (user?.role as "learner" | "trainer" | "admin") || "learner",
      captcha: "",
      rememberMe: true,
    },
  });

  const emailValue = watch("email");

  function generateCaptcha() {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const handleRefreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptchaError("");
  };

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

  const onSubmit = (data: LoginFormInputs) => {
    if (data.captcha.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setCaptchaError(t("auth.captcha_error"));
      return;
    }

    setCaptchaError("");
    setIsLoading(true);

    let nameToUse = user?.fullName || "Keiyona Rodrigues";
    if (data.email.toLowerCase().includes("keiyona")) {
      nameToUse = "Keiyona Rodrigues";
    }

    loginUser({
      email: data.email,
      role: data.role,
      fullName: nameToUse,
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
        {/* LEFT PANEL: Ministry of... and Website Name ONLY */}
        <div className="lg:col-span-5 gov-security-grid p-8 lg:p-14 text-white flex flex-col justify-center relative overflow-hidden border-r border-slate-800">
          <div className="relative z-10 space-y-8 max-w-md">
            {/* National Emblem & Ministry */}
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

            {/* Platform Branding: Website Name only */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
                {t("brand")}
              </h1>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Direct, Streamlined Form Gateway (7 cols) */}
        <div className="lg:col-span-7 bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto">
          <div>
            {/* Top Bar: Accessibility & Multilingual Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-200">
              {/* Accessibility Controls */}
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

            {/* Clean Statutory Warning Banner */}
            <div className="mb-5 p-3 rounded-lg bg-amber-50/80 border border-amber-200 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <p className="text-xs text-amber-900 leading-tight font-medium">
                {t("auth.sec_warning")}
              </p>
            </div>

            {/* Navigation Switch Tabs: Sign In / Officer Registration */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                type="button"
                className="py-2.5 px-4 font-semibold text-sm border-b-2 border-blue-900 text-blue-900 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{t("auth.signin_tab")}</span>
              </button>
              <Link
                to="/signup"
                className="py-2.5 px-4 font-medium text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
              >
                <span>{t("auth.signup_tab")}</span>
              </Link>
            </div>

            {/* Main Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Role Selection */}
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

              {/* Official Email */}
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
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none transition-colors ${
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t("auth.password_label")} <span className="text-red-600">*</span>
                  </label>
                  <a
                    href="#forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset instructions sent to official service email / Parichay portal.");
                    }}
                    className="text-xs text-blue-800 hover:text-blue-950 font-medium hover:underline"
                  >
                    {t("auth.forgot_password")}
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    {...register("password", {
                      required: "Password is required",
                    })}
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.password_placeholder")}
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none transition-colors ${
                      errors.password ? "border-red-500 bg-red-50/20" : "border-slate-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* CAPTCHA Verification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("auth.captcha_label")} <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  <div className="sm:col-span-6 flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 text-amber-400 font-mono text-lg font-bold tracking-widest px-4 py-2 rounded-lg text-center select-none shadow-inner border border-slate-700">
                      {captchaCode}
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
                      title={t("auth.captcha_refresh")}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      {...register("captcha", {
                        required: "Security code is required",
                      })}
                      type="text"
                      placeholder={t("auth.captcha_placeholder")}
                      maxLength={6}
                      className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 font-mono tracking-wider uppercase placeholder-slate-400 focus:ring-2 focus:ring-blue-900 focus:bg-white focus:outline-none ${
                        captchaError || errors.captcha
                          ? "border-red-500 bg-red-50/20"
                          : "border-slate-300"
                      }`}
                    />
                  </div>
                </div>
                {(captchaError || errors.captcha) && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    {captchaError || errors.captcha?.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    {...register("rememberMe")}
                    type="checkbox"
                    className="w-4 h-4 text-blue-900 border-slate-300 rounded focus:ring-blue-900 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    {t("auth.remember_me")}
                  </span>
                </label>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                leftIcon={<Lock className="w-4 h-4" />}
                className="mt-2 text-sm"
              >
                {isLoading ? t("auth.signing_in") : t("auth.login_button")}
              </Button>
            </form>

            {/* Switch to Registration */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <p className={`${fontSizeClass} text-slate-600`}>
                {t("auth.no_account")}{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-900 hover:text-blue-950 hover:underline inline-flex items-center gap-1"
                >
                  {t("auth.go_signup")} &rarr;
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
