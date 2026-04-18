"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearTokens,
  fetchMe,
  loginWithEmail,
  registerAccount,
  type UserMe,
} from "@/lib/auth";
import { syncGuestCartWithBackend } from "@/lib/cartApi";

type AuthContextValue = {
  user: UserMe | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: {
    email: string;
    password: string;
    password_confirm: string;
    first_name?: string;
    last_name?: string;
    phone: string;
    is_business?: boolean;
    company_name?: string;
    gst_number?: string;
    company_phone?: string;
    company_email?: string;
    company_address?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  broadcastSync: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for cross-tab auth syncs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "jfp_auth_sync") {
        refreshUser();
      } else if (e.key === "jfp_logout_sync") {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [refreshUser]);

  const broadcastSync = useCallback(() => {
    window.localStorage.setItem("jfp_auth_sync", Date.now().toString());
  }, []);

  const broadcastLogout = useCallback(() => {
    window.localStorage.setItem("jfp_logout_sync", Date.now().toString());
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
    await syncGuestCartWithBackend();
    await refreshUser();
    broadcastSync();
    window.dispatchEvent(new Event("jfp-cart-updated"));
  }, [refreshUser, broadcastSync]);

  const register = useCallback(
    async (p: {
      email: string;
      password: string;
      password_confirm: string;
      first_name?: string;
      last_name?: string;
      phone: string;
      is_business?: boolean;
      company_name?: string;
      gst_number?: string;
      company_phone?: string;
      company_email?: string;
      company_address?: string;
    }) => {
      await registerAccount(p);
      await loginWithEmail(p.email, p.password);
      await syncGuestCartWithBackend();
      await refreshUser();
      broadcastSync();
      window.dispatchEvent(new Event("jfp-cart-updated"));
    },
    [refreshUser, broadcastSync]
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    broadcastLogout();
  }, [broadcastLogout]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      broadcastSync,
    }),
    [user, loading, login, register, logout, refreshUser, broadcastSync]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
