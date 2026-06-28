"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { signOut as sbSignOut } from "@/lib/auth";
import LoginModal from "./LoginModal";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** 프리미엄(구독/트라이얼) 여부. 현재는 dev 토글 기반, 추후 premium_until 연동. */
  isPremium: boolean;
  openLogin: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) setLoginOpen(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 프리미엄 상태 — 현재 dev 토글(localStorage). 다음 단계에서 profiles.premium_until 연동.
  useEffect(() => {
    const read = () =>
      setIsPremium(
        typeof window !== "undefined" &&
          localStorage.getItem("gcnote_dev_premium") === "1"
      );
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, [user]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const signOut = useCallback(async () => {
    await sbSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isPremium, openLogin, signOut }}>
      {children}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </AuthContext.Provider>
  );
}
