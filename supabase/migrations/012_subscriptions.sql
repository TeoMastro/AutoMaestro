-- ============================================================
-- Migration 012: Stripe Subscription Support
-- ============================================================
-- Adds subscription columns to profiles, updates the new-user
-- trigger to assign MANAGER role + 14-day free trial on
-- self-registration, and creates a helper function to check
-- whether a client's manager has an active subscription.
-- ============================================================

-- 1. Add subscription columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN subscription_tier TEXT CHECK (subscription_tier IN ('freelancer', 'agency', 'scale')),
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  ADD COLUMN subscription_end_date TIMESTAMPTZ,
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN has_used_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN stripe_subscription_id TEXT UNIQUE;

-- 2. Update handle_new_user trigger
--    Self-registered users (no 'created_by_admin' metadata) become
--    MANAGER with a 14-day trial.  Admin-created users keep the
--    default CLIENT role and skip the trial (the calling server
--    action immediately updates role/status anyway).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'created_by_admin' IS NOT NULL THEN
    -- Admin-created user: CLIENT, no trial
    INSERT INTO public.profiles (id, email, first_name, last_name, role, subscription_status)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      'CLIENT',
      'none'
    );
  ELSE
    -- Self-registered user: MANAGER with 14-day trial
    INSERT INTO public.profiles (id, email, first_name, last_name, role, subscription_status, trial_ends_at, has_used_trial)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      'MANAGER',
      'trialing',
      now() + interval '14 days',
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper: check if any manager sharing a company with the
--    given client has an active subscription (or valid trial).
CREATE OR REPLACE FUNCTION public.any_manager_has_active_sub(p_client_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_companies uc_client
    JOIN public.user_companies uc_manager ON uc_client.company_id = uc_manager.company_id
    JOIN public.profiles p ON p.id = uc_manager.user_id
    WHERE uc_client.user_id = p_client_id
      AND p.role = 'MANAGER'
      AND (
        p.subscription_status IN ('active', 'past_due')
        OR (p.subscription_status = 'trialing' AND p.trial_ends_at > now())
      )
  );
$$;

-- 4. Helper: get the manager profile for a client (for fetching
--    subscription end date to display to clients).
CREATE OR REPLACE FUNCTION public.get_manager_for_client(p_client_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT p.id
  FROM public.user_companies uc_client
  JOIN public.user_companies uc_manager ON uc_client.company_id = uc_manager.company_id
  JOIN public.profiles p ON p.id = uc_manager.user_id
  WHERE uc_client.user_id = p_client_id
    AND p.role = 'MANAGER'
  LIMIT 1;
$$;
