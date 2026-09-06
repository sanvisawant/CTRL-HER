import React, { createContext, useContext, useState, useEffect } from "react";

export interface OfficerUser {
  fullName: string;
  designation: string;
  cadreId: string;
  email: string;
  role: "learner" | "trainer" | "admin";
  division?: string;
  phone?: string;
}

export const CONTROLLED_PERSONAS: Record<"learner" | "trainer" | "admin", OfficerUser> = {
  learner: {
    fullName: " Siya Sharma",
    designation: "Senior Statistical Officer (ISS)",
    cadreId: "ISS-2024-8921",
    email: "siya.sharma@gov.in",
    role: "learner",
    division: "MoSPI Field Operations Division",
  },
  trainer: {
    fullName: "Dr. Alok Sharma",
    designation: "Subject Matter Specialist & Master Trainer",
    cadreId: "TRN-2024-1042",
    email: "alok.sharma@gov.in",
    role: "trainer",
    division: "National Statistical Systems Training Academy (NSSTA)",
  },
  admin: {
    fullName: "Rajesh Kumar",
    designation: "Director General & Cadre Administrator",
    cadreId: "ADM-2024-001",
    email: "rajesh.kumar@nic.in",
    role: "admin",
    division: "Ministry Administration & Human Resources",
  },
};

interface AuthContextType {
  user: OfficerUser;
  setUser: (user: OfficerUser) => void;
  loginUser: (userData: Partial<OfficerUser>) => void;
  switchPersona: (role: "learner" | "trainer" | "admin") => void;
  logoutUser: () => void;
  getInitials: () => string;
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
    // Authoritatively resolve to controlled persona based on designated role
    const chosenRole = userData.role || "learner";
    const basePersona = CONTROLLED_PERSONAS[chosenRole] || CONTROLLED_PERSONAS.learner;
    const resolved: OfficerUser = {
      ...basePersona,
      ...userData,
      role: chosenRole, // enforce authoritative role match
    };
    setUser(resolved);
  };

  const logoutUser = () => {
    // Reset to default learner
    setUser(CONTROLLED_PERSONAS.learner);
  };

  const getInitials = () => {
    if (!user?.fullName) return "KR";
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  useEffect(() => {
    localStorage.setItem("statsaksham_officer_profile", JSON.stringify(user));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loginUser, switchPersona, logoutUser, getInitials }}
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
