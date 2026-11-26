BEGIN;

-- Backfill missing profiles
INSERT INTO public.profiles (id, updated_at)
SELECT u.id, NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Restore missing profile names
UPDATE public.profiles p
SET
    full_name = TRIM(u.raw_user_meta_data ->> 'full_name'),
    updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
AND NULLIF(TRIM(p.full_name), '') IS NULL
AND NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), '') IS NOT NULL;

-- Automatically create profiles for new registrations
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        updated_at
    )
    VALUES (
        NEW.id,
        NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_create_profile ON auth.users;

CREATE TRIGGER on_auth_user_create_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

COMMIT;
