import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Compass,
  Target,
  GraduationCap,
  BookOpen,
  FileCheck,
  Sparkles,
  Trophy,
  BarChart3,
  Bell,
  Search,
  Globe,
  LogOut,
  HelpCircle,
  Menu,
  X,
  Radio,
  Users,
  SlidersHorizontal,
  Landmark,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  label: string;
  icon: any;
  path: string;
  badge?: string;
  colorClass: string;
  activeBg: string;
}

export const AppLayout = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getInitials, switchPersona, logoutUser } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const userRole = user?.role || "learner";

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Modern LMS / EdTech Navigation structure with rich intentional accents
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", colorClass: "text-indigo-600 bg-indigo-50", activeBg: "bg-indigo-50 text-indigo-700" },
      { label: "My Journey", icon: Compass, path: "/journey", colorClass: "text-amber-500 bg-amber-50", activeBg: "bg-amber-50 text-amber-800" },
      { label: "Competencies", icon: Target, path: "/competency", colorClass: "text-emerald-600 bg-emerald-50", activeBg: "bg-emerald-50 text-emerald-800" },
      { label: "iGOT Pathways", icon: GraduationCap, path: "/igot-learning", colorClass: "text-sky-600 bg-sky-50", activeBg: "bg-sky-50 text-sky-800" },
      { label: "Knowledge Repository", icon: BookOpen, path: "/learning", colorClass: "text-teal-600 bg-teal-50", activeBg: "bg-teal-50 text-teal-800" },
      { label: "Quizzes & Assessments", icon: FileCheck, path: "/assessment", colorClass: "text-rose-600 bg-rose-50", activeBg: "bg-rose-50 text-rose-800" },
      { label: "AI Copilot", icon: Sparkles, path: "/ai-assistant", badge: "AI", colorClass: "text-violet-600 bg-violet-50", activeBg: "bg-violet-50 text-violet-800" },
      { label: "Competency Quest", icon: Trophy, path: "/quest", colorClass: "text-orange-600 bg-orange-50", activeBg: "bg-orange-50 text-orange-800" },
    ];

    if (userRole === "admin") {
      items.push({ label: "Cadre Analytics", icon: BarChart3, path: "/analytics", colorClass: "text-blue-600 bg-blue-50", activeBg: "bg-blue-50 text-blue-800" });
      items.push({ label: "User Management", icon: Users, path: "/admin/users", colorClass: "text-purple-600 bg-purple-50", activeBg: "bg-purple-50 text-purple-800" });
    } else if (userRole === "trainer") {
      items.push({ label: "Question Bank", icon: FileCheck, path: "/trainer/questions", colorClass: "text-rose-600 bg-rose-50", activeBg: "bg-rose-50 text-rose-800" });
    }

    items.push({ label: "Portal Notices", icon: Radio, path: "/notices", colorClass: "text-slate-600 bg-slate-100", activeBg: "bg-slate-100 text-slate-900" });
    return items;
  };

  const navItems = getNavItems();

  const officerName =
    user?.fullName &&
    (user.fullName.toLowerCase().includes("sanvi") ||
      user.fullName.toLowerCase().includes("siya") ||
      user.fullName.toLowerCase().includes("keiyona"))
      ? i18n.language === "hi"
        ? "सान्वी सावंत"
        : i18n.language === "mr"
        ? "सान्वी सावंत"
        : user.fullName
      : user?.fullName || "Sanvi Sawant";

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/learning?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans antialiased">
      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-100">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" opacity="0.6" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                DAKSHA
              </span>
              <span className="bg-gradient-to-r from-violet-100 to-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide border border-indigo-200/60">
                MOSPI AI
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Middle: Navigation Links */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? `${item.activeBg} font-bold shadow-2xs translate-x-0.5`
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.colorClass}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </div>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Pinned Footer: Officer Profile Card & Help */}
        <div className="p-3 border-t border-slate-100 bg-white space-y-2 relative">
          {/* Settings / Persona Switcher Popover */}
          {settingsOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 space-y-2.5 text-xs animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800">Switch Role / Cadre</span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    switchPersona("learner");
                    setSettingsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    userRole === "learner"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Officer (Learner) • Sanvi Sawant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchPersona("trainer");
                    setSettingsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    userRole === "trainer"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Master Trainer • Dr. Alok Sharma
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchPersona("admin");
                    setSettingsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    userRole === "admin"
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Cadre Administrator • Rajesh Kumar
                </button>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    logoutUser();
                    navigate("/login");
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Officer Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white shrink-0 flex items-center justify-center font-bold text-xs shadow-xs select-none">
                {getInitials()}
              </div>
              <div className="truncate text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 truncate">{officerName}</p>
                <p className="text-[10px] text-slate-500 truncate">ISS • Level 4</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Settings & Persona Switcher"
              aria-label="Settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Footer Sub-row: Support and Version */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <button
              type="button"
              onClick={() =>
                alert("MoSPI Cadre Helpdesk: 1800-11-MoSPI (Toll Free) | helpdesk-daksha@nic.in")
              }
              className="flex items-center gap-1.5 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>
            <span className="font-mono text-[10px] text-slate-400">v2.4-gov</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area + Top Navigation */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-slate-50">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-slate-900 text-sm">DAKSHA</span>
          </div>

          {/* Center: Rounded Global Search Bar with ⌘K */}
          <form
            onSubmit={handleGlobalSearchSubmit}
            className="flex-1 max-w-xl mx-auto hidden sm:block"
          >
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search competencies, manuals, or training modules..."
                className="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-100/70 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <span className="absolute right-2.5 top-1.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200/90 rounded shadow-2xs pointer-events-none">
                ⌘K
              </span>
            </div>
          </form>

          {/* Right: Institutional Badge, Language Selector, Bell, Officer Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Institutional Badge ("MoSPI • GoI") */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
              <Landmark className="w-3.5 h-3.5 text-slate-500" />
              <span>MoSPI • GoI</span>
            </div>

            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-1 border border-slate-200/80 rounded-lg px-2 py-1 bg-slate-50 text-xs text-slate-700 font-medium hover:bg-slate-100 transition-colors">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                onChange={(e) => changeLanguage(e.target.value)}
                value={i18n.language ? i18n.language.slice(0, 2) : "en"}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
                aria-label="Language selection"
              >
                <option value="en">English (IN)</option>
                <option value="hi">हिन्दी (IN)</option>
                <option value="mr">मराठी (IN)</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-1" />
            </div>

            {/* Notification Center with Dot */}
            <button
              type="button"
              onClick={() => alert("Notification: Annual MoSPI Competency Evaluation round is now active.")}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative cursor-pointer transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-blue-600 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
            </button>

            {/* Officer Avatar Header Profile */}
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs transition-colors select-none"
              title={`${officerName} - Click to configure`}
            >
              {getInitials()}
            </button>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

