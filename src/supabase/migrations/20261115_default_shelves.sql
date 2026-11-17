-- ============================================================
-- Default shelves: "Current Reads", "Finished", "Did Not Finish"
--
-- Every account owns these three shelves. They are flagged is_default and
-- cannot be deleted.
--
-- The app also seeds them (shelfService.ensureDefaultShelves) so accounts
-- work before this migration is applied; the trigger below covers every
-- signup afterwards, and the backfill covers accounts that already exist.
-- ============================================================

-- Insert the default shelves a user is missing. Name-based so re-running the
-- migration (or firing the trigger twice) never duplicates a shelf.
CREATE OR REPLACE FUNCTION seed_default_shelves(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO shelves (user_id, name, description, is_default)
  SELECT p_user_id, d.name, d.description, TRUE
  FROM (VALUES
    ('Current Reads',  'Books you are reading right now.'),
    ('Finished',       'Books you have completed.'),
    ('Did Not Finish', 'Books you stopped reading.')
  ) AS d(name, description)
  WHERE NOT EXISTS (
    SELECT 1
    FROM shelves s
    WHERE s.user_id = p_user_id
      AND s.name = d.name
  );
$$;

-- Give every new account its shelves at signup.
CREATE OR REPLACE FUNCTION handle_new_user_default_shelves()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_default_shelves(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_default_shelves ON auth.users;

CREATE TRIGGER on_auth_user_default_shelves
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_default_shelves();

-- Backfill accounts that signed up before this shipped.
SELECT seed_default_shelves(id) FROM auth.users;

-- Guard against a duplicate set of default shelves. The app shares an
-- in-flight seeding promise, but two tabs (or a slow request racing a remount)
-- can still both try to insert; this makes the database refuse the second.
CREATE UNIQUE INDEX IF NOT EXISTS shelves_default_name_unique
  ON shelves (user_id, name)
  WHERE is_default;

-- Default shelves are part of the product, not user data: refuse the delete.
-- Returns no row when it refuses, which deleteShelf() treats as failure.
CREATE OR REPLACE FUNCTION delete_shelf(p_shelf_id UUID)
RETURNS shelves
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM shelves
  WHERE id = p_shelf_id
  AND user_id = auth.uid()
  AND is_default = FALSE
  RETURNING *;
$$;
