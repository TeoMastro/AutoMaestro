import { createClient } from '@/lib/supabase/server';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
    first_name: string | null;
    last_name: string | null;
    createdAt: Date;
    updatedAt: Date;
    subscription_tier: string | null;
    subscription_status: string;
    subscription_end_date: Date | null;
    trial_ends_at: Date | null;
  };
}

export async function getSession(): Promise<AuthSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, status, first_name, last_name, created_at, updated_at, subscription_tier, subscription_status, subscription_end_date, trial_ends_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      first_name: profile.first_name,
      last_name: profile.last_name,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
      subscription_tier: profile.subscription_tier ?? null,
      subscription_status: profile.subscription_status ?? 'none',
      subscription_end_date: profile.subscription_end_date ? new Date(profile.subscription_end_date) : null,
      trial_ends_at: profile.trial_ends_at ? new Date(profile.trial_ends_at) : null,
    },
  };
}
