import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Award,
  BookOpen,
  GraduationCap,
  FileCheck,
  Bot,
  Compass,
  BarChart3,
  Bell,
  Search,
  Globe,
  LogOut,
  HelpCircle,
  Sparkles,
  Menu,
  X,
  Radio,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const AppLayout = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, getInitials } = useAuth();

  const [textSize, setTextSize] = useState<"normal" | "large" | "largest">("normal");
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const navItems = [
    { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/dashboard" },
    { label: t("nav.competency"), icon: Award, path: "/competency" },
    { label: t("nav.learning"), icon: BookOpen, path: "/learning" },
    { label: t("nav.assessments"), icon: FileCheck, path: "/assessment" },
    { label: t("nav.ai_assistant"), icon: Bot, path: "/ai-assistant", badge: "AI" },
    { label: t("nav.quest"), icon: Compass, path: "/quest" },
    { label: t("nav.analytics"), icon: BarChart3, path: "/analytics" },
    { label: t("nav.notices"), icon: Radio, path: "/notices" },
    {
  label: "iGOT Learning",
  icon: GraduationCap,
  path: "/igot-learning",
},
  ];

  const textSizeClass =
    textSize === "largest" ? "text-lg" : textSize === "large" ? "text-base" : "text-sm";

  // Compute officer name in current language if match or fallback to user's registered name
  const officerName =
    user?.fullName && user.fullName.toLowerCase().includes("keiyona")
      ? (i18n.language === "hi" ? "केयोना रोड्रिग्स" : i18n.language === "mr" ? "केयोना रॉड्रिग्ज" : user.fullName)
      : user?.fullName || "Keiyona Rodrigues";

  const officerDesignation = user?.designation || t("officer.designation");

  return (
    <div
      className={`min-h-screen flex flex-col bg-slate-100 ${
        isHighContrast ? "high-contrast" : ""
      }`}
    >
      {/* Indian National Tricolor Portal Top Bar */}
      <div className="gov-tricolor-bar" />

      {/* Top Bar: Institutional Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          {/* Brand & Crest */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              {/* National Emblem SVG */}
              <div className="w-9 h-9 rounded bg-slate-900 p-1 flex items-center justify-center text-amber-400 shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
                  <path d="M12 2L15 8H9L12 2Z" />
                  <path d="M5 9C5 9 6 12 7 13C8 14 10 14 10 14L8 16L9 18L12 17L15 18L16 16L14 14C14 14 16 14 17 13C18 12 19 9 19 9H5Z" />
                  <path d="M8 19H16V21C16 21.5 15.5 22 15 22H9C8.5 22 8 21.5 8 21V19Z" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Link to="/dashboard" className="font-bold text-lg text-blue-900 tracking-tight">
                    {t("brand")}
                  </Link>
                </div>
                <p className="text-[11px] text-slate-500 hidden md:block leading-none">
                  {t("ministry")} • {t("gov_india")}
                </p>
              </div>
            </div>
          </div>

          {/* Search, Accessibility, Multilingual, Notifications & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={t("common.search_placeholder")}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-colors"
              />
            </div>

            {/* Font Sizing */}
            <div className="hidden sm:inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setTextSize("normal")}
                className={`px-2 py-0.5 text-xs font-bold rounded ${
                  textSize === "normal"
                    ? "bg-blue-900 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
                title={t("common.text_normal")}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setTextSize("large")}
                className={`px-2 py-0.5 text-xs font-bold rounded ${
                  textSize === "large"
                    ? "bg-blue-900 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
                title={t("common.text_large")}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setTextSize("largest")}
                className={`px-2 py-0.5 text-xs font-bold rounded ${
                  textSize === "largest"
                    ? "bg-blue-900 text-white"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
                title={t("common.text_largest")}
              >
                A+
              </button>
            </div>

            {/* High Contrast Toggle */}
            <button
              type="button"
              onClick={() => setIsHighContrast(!isHighContrast)}
              className={`hidden sm:inline-block px-2 py-1 text-xs font-semibold rounded border transition-colors ${
                isHighContrast
                  ? "bg-yellow-400 text-black border-yellow-500"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {isHighContrast ? "Normal" : t("common.high_contrast")}
            </button>

            {/* Dynamic i18n Language Dropdown */}
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                onChange={(e) => changeLanguage(e.target.value)}
                value={i18n.language}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                aria-label={t("common.language")}
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            {/* Notification Center */}
            <button
              type="button"
              onClick={() => alert("Notification: Annual MoSPI Competency Evaluation round is now active.")}
              className="p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-amber-600 rounded-full absolute top-1.5 right-1.5" />
            </button>

            {/* Officer Profile Summary with Dynamic Registered Name */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                {getInitials()}
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <p className="text-xs font-bold text-slate-900">{officerName}</p>
                <p className="text-[10px] text-teal-700 font-semibold">{officerDesignation}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Layout with Sidebar */}
      <div className={`flex flex-1 ${textSizeClass}`}>
        {/* Left Sidebar Navigation */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out ${
            mobileMenuOpen
              ? "translate-x-0 top-16 shadow-2xl"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="space-y-4">
            {/* Navigation Links */}
            <nav className="space-y-1.5" aria-label="Portal Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-blue-900 text-white shadow-xs"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500 text-white flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer & Logout */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <button
              type="button"
              onClick={() => {
                alert("MoSPI Cadre Helpdesk: 1800-11-MoSPI (Toll Free) | helpdesk-statsaksham@nic.in");
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>{t("nav.helpdesk")}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        </aside>

        {/* Mobile menu backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/40 z-20 lg:hidden backdrop-blur-xs"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Institutional Global Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <p className="text-slate-300 font-medium">{t("common.copyright")}</p>
          <div className="flex items-center gap-4 text-slate-300 text-xs">
            <a href="#terms" className="hover:text-white hover:underline">{t("common.terms_of_service")}</a>
            <span>•</span>
            <a href="#privacy" className="hover:text-white hover:underline">{t("common.privacy_policy")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
