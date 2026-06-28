import { supabase } from "./supabase";

const origin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

/** 카카오 OAuth 로그인 (Supabase Auth 프로바이더 활성화 필요). */
export async function signInWithKakao() {
  return supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: origin() },
  });
}

/** 구글 OAuth 로그인 (Supabase Auth 프로바이더 활성화 필요). */
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: origin() },
  });
}

/** 이메일 매직링크 로그인 — OAuth 셋업 없이 즉시 사용 가능(로컬 테스트용). */
export async function signInWithEmailLink(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: origin() },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
