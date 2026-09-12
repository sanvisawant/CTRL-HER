import React, { createContext, useContext, useState, useEffect } from "react";

export interface VerifiedSkillScore {
  score: number; // 0.0 to 4.0
  percentage: number;
  date: string;
  totalQuestions: number;
  correctAnswers: number;
}

export interface OfficerUser {
  fullName: string;
  designation: string;
  cadreId: string;
  email: string;
  role: "learner" | "trainer" | "admin";
  division?: string;
  phone?: string;
  declaredSkills?: string[];
  isFirstTimeUser?: boolean;
  hasCompletedBaseline?: boolean;
  verifiedSkillScores?: Record<string, VerifiedSkillScore>;
}

export const CONTROLLED_PERSONAS: Record<"learner" | "trainer" | "admin", OfficerUser> = {
  learner: {
    fullName: "Sanvi Sawant",
    designation: "Senior Statistical Officer (ISS)",
    cadreId: "ISS-2024-8921",
    email: "sanvi.sawant@gov.in",
    role: "learner",
    division: "MoSPI Field Operations Division",
    declaredSkills: ["Survey Sampling", "Data Quality & Scrutiny", "Statistical Analysis"],
    isFirstTimeUser: false,
    hasCompletedBaseline: true,
  },
  trainer: {
    fullName: "Dr. Alok Sharma",
    designation: "Subject Matter Specialist & Master Trainer",
    cadreId: "TRN-2024-1042",
    email: "alok.sharma@gov.in",
    role: "trainer",
    division: "National Statistical Systems Training Academy (NSSTA)",
    declaredSkills: ["National Accounts", "Index Numbers", "Econometrics"],
    isFirstTimeUser: false,
    hasCompletedBaseline: true,
  },
  admin: {
    fullName: "Rajesh Kumar",
    designation: "Director General & Cadre Administrator",
    cadreId: "ADM-2024-001",
    email: "rajesh.kumar@nic.in",
    role: "admin",
    division: "Ministry Administration & Human Resources",
    declaredSkills: ["Public Policy", "Cadre Management", "Digital Governance"],
    isFirstTimeUser: false,
    hasCompletedBaseline: true,
  },
};

interface AuthContextType {
  user: OfficerUser;
  setUser: (user: OfficerUser) => void;
  loginUser: (userData: Partial<OfficerUser>) => void;
  switchPersona: (role: "learner" | "trainer" | "admin") => void;
  logoutUser: () => void;
  getInitials: () => string;
  recordSkillAssessment: (
    skill: string,
    score: number,
    percentage: number,
    totalQuestions: number,
    correctAnswers: number
  ) => void;
  resetToFreshUser: (skills?: string[]) => void;
}

const DEFAULT_USER: OfficerUser = CONTROLLED_PERSONAS.learner;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<OfficerUser>(() => {
    try {
      const saved = localStorage.getItem("statsaksham_officer_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName && parsed.role) {
          if (
            parsed.fullName.toLowerCase().includes("keiyona") ||
            parsed.fullName.toLowerCase().includes("siya")
          ) {
            parsed.fullName = "Sanvi Sawant";
            parsed.email = "sanvi.sawant@gov.in";
          }
          return { ...DEFAULT_USER, ...parsed };
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_USER;
  });

  const setUser = (newUser: OfficerUser) => {
    setUserState(newUser);
    localStorage.setItem("statsaksham_officer_profile", JSON.stringify(newUser));
  };

  const switchPersona = (role: "learner" | "trainer" | "admin") => {
    const persona = CONTROLLED_PERSONAS[role] || CONTROLLED_PERSONAS.learner;
    setUser(persona);
  };

  const loginUser = (userData: Partial<OfficerUser>) => {
    const chosenRole = userData.role || "learner";
    const basePersona = CONTROLLED_PERSONAS[chosenRole] || CONTROLLED_PERSONAS.learner;
    const resolved: OfficerUser = {
      ...basePersona,
      ...userData,
      role: chosenRole,
      declaredSkills: userData.declaredSkills ?? basePersona.declaredSkills ?? [],
      isFirstTimeUser: userData.isFirstTimeUser ?? false,
      hasCompletedBaseline: userData.hasCompletedBaseline ?? false,
      verifiedSkillScores: userData.verifiedSkillScores ?? {},
    };
    setUser(resolved);
  };

  const recordSkillAssessment = (
    skill: string,
    score: number,
    percentage: number,
    totalQuestions: number,
    correctAnswers: number
  ) => {
    setUserState((prev) => {
      const updatedScores = {
        ...(prev.verifiedSkillScores || {}),
        [skill]: {
          score: Number(score.toFixed(1)),
          percentage: Math.round(percentage),
          date: new Date().toISOString(),
          totalQuestions,
          correctAnswers,
        },
      };
      const updatedUser: OfficerUser = {
        ...prev,
        hasCompletedBaseline: true,
        verifiedSkillScores: updatedScores,
      };
      localStorage.setItem("statsaksham_officer_profile", JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const resetToFreshUser = (skills: string[] = ["Survey Sampling", "Data Quality & Scrutiny"]) => {
    const freshUser: OfficerUser = {
      ...DEFAULT_USER,
      declaredSkills: skills,
      isFirstTimeUser: true,
      hasCompletedBaseline: false,
      verifiedSkillScores: {},
    };
    setUser(freshUser);
  };

  const logoutUser = () => {
    setUser(CONTROLLED_PERSONAS.learner);
  };

  const getInitials = () => {
    if (!user?.fullName) return "SS";
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    localStorage.setItem("statsaksham_officer_profile", JSON.stringify(user));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loginUser,
        switchPersona,
        logoutUser,
        getInitials,
        recordSkillAssessment,
        resetToFreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
