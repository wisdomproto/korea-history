import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 클라이언트 전용(localStorage 세션) 구조 — 매직링크/OAuth redirect를 별도
// /auth/callback 라우트 없이 클라이언트가 URL에서 직접 처리하도록 옵션 명시.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
  },
});

export type Board = "free" | "suggestion" | "notice";

export const BOARD_LABELS: Record<Board, string> = {
  free: "자유 게시판",
  suggestion: "건의 게시판",
  notice: "공지사항",
};

export const BOARD_DESCRIPTIONS: Record<Board, string> = {
  free: "자유롭게 이야기를 나눠보세요",
  suggestion: "서비스 개선을 위한 건의사항을 남겨주세요",
  notice: "공지사항 및 업데이트 안내",
};

export interface Post {
  id: string;
  board: Board;
  nickname: string;
  title: string;
  content: string;
  view_count: number;
  like_count: number;
  pinned: boolean;
  comment_count?: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  nickname: string;
  content: string;
  created_at: string;
}
