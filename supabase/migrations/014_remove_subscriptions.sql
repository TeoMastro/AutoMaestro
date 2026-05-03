-- ============================================================
-- Migration 014: Remove Stripe Subscription State
-- ============================================================
-- Drops the subscription columns added in 012/013, drops the
-- subscription helper RPCs, and simplifies handle_new_user.
-- Self-signup is now disabled at the application layer; if a row
-- ever ends up in auth.users, the trigger inserts a CLIENT-role
-- profile (admin server actions immediately override the role
-- when creating staff/managers).
-- ============================================================

-- 1. Drop subscription columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS subscription_tier,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_end_date,
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;

-- 2. Drop subscription helper RPCs
DROP FUNCTION IF EXISTS public.any_manager_has_active_sub(UUID);
DROP FUNCTION IF EXISTS public.get_manager_for_client(UUID);

-- 3. Simplify handle_new_user (default role: CLIENT)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'CLIENT'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
