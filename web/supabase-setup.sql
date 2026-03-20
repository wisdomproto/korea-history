-- 게시판 테이블
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board TEXT NOT NULL CHECK (board IN ('free', 'suggestion', 'notice')),
  nickname TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 20),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  password TEXT NOT NULL DEFAULT '',
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 인덱스
CREATE INDEX idx_posts_board_created ON posts (board, created_at DESC);

-- RLS 활성화
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능
CREATE POLICY "read_all" ON posts FOR SELECT USING (true);

-- 누구나 글쓰기 가능 (공지 제외 — API에서 검증)
CREATE POLICY "insert_all" ON posts FOR INSERT WITH CHECK (true);

-- 누구나 수정 가능 (조회수/좋아요 업데이트용, API에서 검증)
CREATE POLICY "update_all" ON posts FOR UPDATE USING (true);

-- 비밀번호 확인 후 삭제하는 함수 (RLS 우회)
CREATE OR REPLACE FUNCTION delete_post_with_password(p_id UUID, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM posts WHERE id = p_id AND password = p_password;
  RETURN FOUND;
END;
$$;

-- 댓글 테이블
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 20),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  password TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_comments_post_id ON comments (post_id, created_at ASC);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all_comments" ON comments FOR SELECT USING (true);
CREATE POLICY "insert_all_comments" ON comments FOR INSERT WITH CHECK (true);

-- 댓글 삭제 함수
CREATE OR REPLACE FUNCTION delete_comment_with_password(p_id UUID, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM comments WHERE id = p_id AND password = p_password;
  RETURN FOUND;
END;
$$;
