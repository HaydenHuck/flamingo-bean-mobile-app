import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { ApiError, fetchCurrentAdmin, loginAdmin, logoutAdmin } from "./api";
import type { AdminUser } from "./types";

interface AuthContextValue {
  adminUser: AdminUser | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const session = await fetchCurrentAdmin();
        setAdminUser(session.admin);
        setCsrfToken(session.csrf_token);
      } catch (error) {
        if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
          console.error("Unable to restore admin session.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void restoreSession();
  }, []);

  async function login(email: string, password: string) {
    const result = await loginAdmin(email.trim().toLowerCase(), password);
    setAdminUser(result.admin);
    setCsrfToken(result.csrf_token);
  }

  async function logout() {
    try {
      if (csrfToken) {
        await logoutAdmin(csrfToken);
      }
    } finally {
      setAdminUser(null);
      setCsrfToken(null);
      window.location.hash = "#/";
    }
  }

  const value = useMemo(
    () => ({
      adminUser,
      csrfToken,
      isAuthenticated: Boolean(adminUser && csrfToken),
      isLoading,
      login,
      logout,
    }),
    [adminUser, csrfToken, isLoading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
