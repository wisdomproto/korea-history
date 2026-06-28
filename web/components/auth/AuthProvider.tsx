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
  /** 프리미엄(구독/트라이얼) 여부. profiles.premium_until > now() (또는 dev 토글). */
  isPremium: boolean;
  /** 프리미엄 만료 시각(ms). 0 = 없음. "트라이얼 N일 남음" 표시용. */
  premiumUntil: number;
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
  const [premiumUntil, setPremiumUntil] = useState(0);
  const [devPremium, setDevPremium] = useState(false);
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

  // dev 토글(localStorage) — 게이팅 로컬 테스트용 fallback.
  useEffect(() => {
    const read = () =>
      setDevPremium(
        typeof window !== "undefined" &&
          localStorage.getItem("gcnote_dev_premium") === "1"
      );
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  // 프리미엄 상태 — profiles.premium_until 조회 (가입 시 7일 트라이얼 부여됨).
  useEffect(() => {
    let active = true;
    if (!user) {
      setPremiumUntil(0);
      return;
    }
    supabase
      .from("profiles")
      .select("premium_until")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setPremiumUntil(
          data?.premium_until ? new Date(data.premium_until).getTime() : 0
        );
      });
    return () => {
      active = false;
    };
  }, [user]);

  const isPremium = devPremium || premiumUntil > Date.now();

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const signOut = useCallback(async () => {
    await sbSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isPremium, premiumUntil, openLogin, signOut }}>
      {children}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </AuthContext.Provider>
  );
}
