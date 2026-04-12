-- ============================================================
-- Migration 013: Subscription Cleanup
-- ============================================================
-- 1. Drop unused has_used_trial column
-- 2. Update handle_new_user trigger to remove has_used_trial
-- ============================================================

-- 1. Drop unused column
ALTER TABLE public.profiles DROP COLUMN has_used_trial;

-- 2. Recreate trigger function without has_used_trial
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
    INSERT INTO public.profiles (id, email, first_name, last_name, role, subscription_status, trial_ends_at)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      'MANAGER',
      'trialing',
      now() + interval '14 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
