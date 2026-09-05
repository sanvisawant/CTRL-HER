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

interface AuthContextType {
  user: OfficerUser;
  setUser: (user: OfficerUser) => void;
  loginUser: (userData: Partial<OfficerUser>) => void;
  logoutUser: () => void;
  getInitials: () => string;
}

const DEFAULT_USER: OfficerUser = {
  fullName: "Keiyona Rodrigues",
  designation: "Senior Statistical Officer (ISS)",
  cadreId: "ISS-2024-8921",
  email: "keiyona.rodrigues@gov.in",
  role: "learner",
  division: "MoSPI Field Operations Division",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<OfficerUser>(() => {
    try {
      const saved = localStorage.getItem("statsaksham_officer_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName) {
          return { ...DEFAULT_USER, ...parsed };
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_USER;
  });

  const setUser = (newUser: OfficerUser) => {
    setUserState(newUser);
    localStorage.setItem("statsaksham_officer_profile", JSON.stringify(newUser));
  };

  const loginUser = (userData: Partial<OfficerUser>) => {
    setUserState((prev) => {
      const updated = {
        ...prev,
        ...userData,
        fullName: userData.fullName || prev.fullName || "Keiyona Rodrigues",
      };
      localStorage.setItem("statsaksham_officer_profile", JSON.stringify(updated));
      return updated;
    });
  };

  const logoutUser = () => {
    // Keep saved profile for next login prefill or fallback
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
    <AuthContext.Provider value={{ user, setUser, loginUser, logoutUser, getInitials }}>
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
