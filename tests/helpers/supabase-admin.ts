import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local for E2E tests'
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export async function deleteUserByEmail(email: string): Promise<void> {
  const admin = getAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (data?.id) {
    await admin.auth.admin.deleteUser(data.id);
  }
}

export async function getProfileByEmail(email: string) {
  const admin = getAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name, role, status')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  return data;
}
