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
  Briefcase,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { AuthBrandPanel } from "./AuthBrandPanel";
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    defaultValues: {
      email: user?.email || "sanvi.sawant@gov.in",
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
      setCaptchaError(t("auth.captcha_error", "Security code does not match"));
      return;
    }

    setCaptchaError("");
    setIsLoading(true);

    let nameToUse = user?.fullName || "Sanvi Sawant";
    if (
      data.email.toLowerCase().includes("sanvi") ||
      data.email.toLowerCase().includes("siya") ||
      data.email.toLowerCase().includes("keiyona")
    ) {
      nameToUse = "Sanvi Sawant";
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
    <div className="h-screen max-h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Official Indian Tricolor National Bar */}
      <div className="gov-tricolor-bar shrink-0" />

      {/* Main Split Portal Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 h-full overflow-hidden">
        {/* Sleek Brand Left Panel (5 cols / ~42-45%) */}
        <AuthBrandPanel mode="login" />

        {/* RIGHT PANEL: Form Canvas (7 cols / ~55-58%) */}
        <main className="lg:col-span-7 bg-white flex flex-col justify-between p-6 sm:p-8 lg:px-14 lg:py-6 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fade-in">
          <div>
            {/* Top Bar: Accessibility & Multilingual Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
              {/* MoSPI Portal Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>MoSPI Authorized Personnel Portal</span>
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

            {/* Navigation Tabs: Sign In vs Register Account */}
            <div className="flex border-b border-slate-200 mb-6 gap-6">
              <button
                type="button"
                className="pb-2.5 font-bold text-sm border-b-2 border-indigo-600 text-indigo-600 flex items-center gap-2 transition-all cursor-default"
              >
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>{t("auth.signin_tab", "Sign In")}</span>
              </button>
              <Link
                to="/signup"
                className="pb-2.5 font-semibold text-sm border-b-2 border-transparent text-slate-400 hover:text-slate-800 hover:border-slate-300 flex items-center gap-2 transition-all"
              >
                <span>{t("auth.signup_tab", "Officer Registration")}</span>
              </Link>
            </div>

            {/* Main Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Cadre Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {t("auth.role_label", "Cadre Role / Designation")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                  </div>
                  <select
                    {...register("role", { required: true })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all cursor-pointer shadow-2xs"
                  >
                    <option value="learner">{t("auth.role_learner", "Cadre Officer / Statistical Investigator (Learner)")}</option>
                    <option value="trainer">{t("auth.role_trainer", "Training Faculty / NASA Faculty (Trainer)")}</option>
                    <option value="admin">{t("auth.role_admin", "System Administrator (Admin)")}</option>
                  </select>
                </div>
              </div>

              {/* Official Email */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t("auth.email_label", "Official Email Address")} <span className="text-rose-500">*</span>
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
                        message: t("auth.email_error", "Please enter a valid email address"),
                      },
                    })}
                    type="email"
                    placeholder={t("auth.email_placeholder", "officer.name@gov.in")}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                      errors.email
                        ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400"
                        : "border-slate-200 hover:border-slate-300"
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t("auth.password_label", "Password")} <span className="text-rose-500">*</span>
                  </label>
                  <a
                    href="#forgot-password"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset instructions sent to official service email / Parichay portal.");
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                  >
                    {t("auth.forgot_password", "Forgot password?")}
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    {...register("password", {
                      required: "Password is required",
                    })}
                    type={showPassword ? "text" : "password"}
                    placeholder={t("auth.password_placeholder", "Enter your account password")}
                    className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                      errors.password
                        ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400"
                        : "border-slate-200 hover:border-slate-300"
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

              {/* CAPTCHA Box Refactor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {t("auth.captcha_label", "Security Verification")} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-6 flex items-center gap-2">
                    {/* Modern Light Indigo Captcha Badge */}
                    <div className="flex-1 bg-indigo-50/80 border border-indigo-200 text-indigo-950 font-mono text-xl font-black tracking-widest px-4 py-2.5 rounded-xl text-center select-none shadow-2xs">
                      {captchaCode}
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-all hover:rotate-180 duration-500 shrink-0 cursor-pointer shadow-2xs"
                      title={t("auth.captcha_refresh", "Generate new security code")}
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
                      placeholder={t("auth.captcha_placeholder", "Enter characters above")}
                      maxLength={6}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm text-slate-800 font-mono font-bold tracking-wider uppercase placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs ${
                        captchaError || errors.captcha
                          ? "border-rose-400 bg-rose-50/20 ring-1 ring-rose-400"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    />
                  </div>
                </div>
                {(captchaError || errors.captcha) && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{captchaError || errors.captcha?.message}</span>
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    {...register("rememberMe")}
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 font-semibold">
                    {t("auth.remember_me", "Remember this workstation for 30 days")}
                  </span>
                </label>
              </div>

              {/* High-Contrast Vibrant Primary Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t("auth.signing_in", "Authenticating...")}</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to DAKSHA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Registration */}
            <div className="mt-5 pt-4 border-t border-slate-100 text-center">
              <p className={`${fontSizeClass} text-slate-500`}>
                {t("auth.no_account", "New to DAKSHA statistical learning?")}{" "}
                <Link
                  to="/signup"
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1"
                >
                  {t("auth.go_signup", "Register Official Account")} &rarr;
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

export default Login;
