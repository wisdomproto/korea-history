import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * service role 클라이언트 — 서버 전용. RLS 우회하여 billing_accounts/payments 쓰기.
 * 키(SUPABASE_SERVICE_ROLE_KEY) 미설정 시 null → 호출부에서 가드(스캐폴드/빌드 안전).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
