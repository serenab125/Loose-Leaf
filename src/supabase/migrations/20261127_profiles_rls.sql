-- ============================================================
-- RLS policies for the profiles table
-- ============================================================
-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow an authenticated user to read their own profile row.
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow an authenticated user to update their own profile row.
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow an authenticated user to insert a profile row for themselves
-- (fires when the sign-up trigger inserts a new row).
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
