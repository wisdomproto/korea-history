import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  created_at: string;
}
