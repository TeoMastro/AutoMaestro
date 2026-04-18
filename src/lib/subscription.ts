import { createAdminClient } from '@/lib/supabase/admin';
import { Role, SubscriptionStatus, SubscriptionTier, TIER_LIMITS, TRIAL_TIER } from '@/lib/constants';

interface SubscriptionProfile {
  role: string;
  subscription_status: string;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  subscription_end_date: string | null;
}

/**
 * Check if a profile has an active subscription or valid trial.
 * ADMINs always return true.
 */
export function isSubscriptionActive(profile: SubscriptionProfile): boolean {
  if (profile.role === Role.ADMIN) return true;

  if (
    profile.subscription_status === SubscriptionStatus.TRIALING &&
    profile.trial_ends_at
  ) {
    return new Date(profile.trial_ends_at) > new Date();
  }

  return (
    profile.subscription_status === SubscriptionStatus.ACTIVE ||
    profile.subscription_status === SubscriptionStatus.PAST_DUE
  );
}

/**
 * Get the effective tier for a profile (uses TRIAL_TIER during trial).
 */
export function getEffectiveTier(profile: SubscriptionProfile): SubscriptionTier | null {
  if (profile.role === Role.ADMIN) return null; // admin has no limits

  if (
    profile.subscription_status === SubscriptionStatus.TRIALING &&
    profile.trial_ends_at &&
    new Date(profile.trial_ends_at) > new Date()
  ) {
    return TRIAL_TIER;
  }

  return (profile.subscription_tier as SubscriptionTier) || null;
}

/**
 * Get the resource limits for a tier.
 */
export function getTierLimits(tier: SubscriptionTier) {
  return TIER_LIMITS[tier];
}

/**
 * Check whether a client's manager has an active subscription.
 */
export async function clientHasActiveManagerSub(clientId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('any_manager_has_active_sub', {
    p_client_id: clientId,
  });

  if (error) return false;
  return data === true;
}

/**
 * Get the manager's email for a client (for display on the subscription-expired page).
 */
export async function getManagerEmailForClient(clientId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: managerId, error: rpcError } = await supabase.rpc('get_manager_for_client', {
    p_client_id: clientId,
  });

  if (rpcError || !managerId) return null;

  const { data: manager, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', managerId)
    .single();

  if (profileError || !manager) return null;
  return manager.email ?? null;
}

/**
 * Get the manager's subscription info for a client (for display purposes).
 */
export async function getManagerSubscriptionForClient(clientId: string): Promise<{
  subscription_end_date: string | null;
  trial_ends_at: string | null;
  subscription_status: string;
  subscription_tier: string | null;
} | null> {
  const supabase = createAdminClient();

  // Get the manager ID
  const { data: managerId, error: rpcError } = await supabase.rpc('get_manager_for_client', {
    p_client_id: clientId,
  });

  if (rpcError || !managerId) return null;

  // Get the manager's subscription fields
  const { data: manager, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_end_date, trial_ends_at, subscription_status, subscription_tier')
    .eq('id', managerId)
    .single();

  if (profileError || !manager) return null;
  return manager;
}

/**
 * Check if a manager can create another resource of a given type.
 */
export async function checkResourceLimit(
  managerId: string,
  resource: 'companies' | 'workflows' | 'clients'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = createAdminClient();

  // Get the manager's subscription profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, subscription_tier, subscription_status, trial_ends_at, subscription_end_date')
    .eq('id', managerId)
    .single();

  if (!profile) return { allowed: false, current: 0, limit: 0 };

  // Admin has no limits
  if (profile.role === Role.ADMIN) return { allowed: true, current: 0, limit: Infinity };

  const tier = getEffectiveTier(profile);
  if (!tier) return { allowed: false, current: 0, limit: 0 };

  const limits = getTierLimits(tier);
  const limit = limits[resource];

  // Count current resources
  const current = await countResources(supabase, managerId, resource);

  return { allowed: current < limit, current, limit };
}

/**
 * Get resource usage for all resource types.
 */
export async function getResourceUsage(managerId: string): Promise<{
  companies: { current: number; limit: number };
  workflows: { current: number; limit: number };
  clients: { current: number; limit: number };
  tier: SubscriptionTier | null;
}> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, subscription_tier, subscription_status, trial_ends_at, subscription_end_date')
    .eq('id', managerId)
    .single();

  if (!profile) {
    return {
      companies: { current: 0, limit: 0 },
      workflows: { current: 0, limit: 0 },
      clients: { current: 0, limit: 0 },
      tier: null,
    };
  }

  if (profile.role === Role.ADMIN) {
    return {
      companies: { current: 0, limit: Infinity },
      workflows: { current: 0, limit: Infinity },
      clients: { current: 0, limit: Infinity },
      tier: null,
    };
  }

  const tier = getEffectiveTier(profile);
  if (!tier) {
    return {
      companies: { current: 0, limit: 0 },
      workflows: { current: 0, limit: 0 },
      clients: { current: 0, limit: 0 },
      tier: null,
    };
  }

  const limits = getTierLimits(tier);

  const [companies, workflows, clients] = await Promise.all([
    countResources(supabase, managerId, 'companies'),
    countResources(supabase, managerId, 'workflows'),
    countResources(supabase, managerId, 'clients'),
  ]);

  return {
    companies: { current: companies, limit: limits.companies },
    workflows: { current: workflows, limit: limits.workflows },
    clients: { current: clients, limit: limits.clients },
    tier,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countResources(supabase: any, managerId: string, resource: string): Promise<number> {
  if (resource === 'companies') {
    const { count } = await supabase
      .from('user_companies')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', managerId);
    return count ?? 0;
  }

  // Get manager's company IDs first
  const { data: userCompanies } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', managerId);

  const companyIds = (userCompanies || []).map((uc: { company_id: string }) => uc.company_id);
  if (companyIds.length === 0) return 0;

  if (resource === 'workflows') {
    const { count } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true })
      .in('company_id', companyIds);
    return count ?? 0;
  }

  if (resource === 'clients') {
    // Count users with CLIENT role in manager's companies
    const { data: clientUserCompanies } = await supabase
      .from('user_companies')
      .select('user_id')
      .in('company_id', companyIds)
      .neq('user_id', managerId);

    if (!clientUserCompanies || clientUserCompanies.length === 0) return 0;

    const clientUserIds = [...new Set(clientUserCompanies.map((uc: { user_id: string }) => uc.user_id))];

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('id', clientUserIds)
      .eq('role', 'CLIENT');

    return count ?? 0;
  }

  return 0;
}
