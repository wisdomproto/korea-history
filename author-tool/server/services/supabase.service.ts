import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(config.supabase.url && config.supabase.serviceRoleKey);
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
