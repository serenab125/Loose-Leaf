-- ============================================================
-- Shelves for user's books
-- ============================================================

-- Shelves table stores user-created shelves
CREATE TABLE IF NOT EXISTS shelves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Untitled Shelf',
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on user_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_shelves_user_id ON shelves (user_id);

-- Ensure RLS is enabled on shelves
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert their own shelves
CREATE POLICY shelves_insert_policy
ON shelves
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Allow users to update their own shelves
CREATE POLICY shelves_update_policy
ON shelves
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Allow users to select their own shelves
CREATE POLICY shelves_select_policy
ON shelves
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Allow users to delete their own shelves
CREATE POLICY shelves_delete_policy
ON shelves
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- shelf_books table stores books within a shelf
CREATE TABLE IF NOT EXISTS shelf_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id        UUID NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  book_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  author          TEXT,
  cover_url       TEXT,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on shelf_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_shelf_books_shelf_id ON shelf_books (shelf_id);

-- Index on book_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_shelf_books_book_id ON shelf_books (book_id);

-- Ensure RLS is enabled on shelf_books
ALTER TABLE shelf_books ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert books into their own shelves
CREATE POLICY shelf_books_insert_policy
ON shelf_books
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shelves
    WHERE shelves.id = shelf_books.shelf_id
    AND shelves.user_id = auth.uid()
  )
);

-- Policy: Allow users to update books in their own shelves
CREATE POLICY shelf_books_update_policy
ON shelf_books
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shelves
    WHERE shelves.id = shelf_books.shelf_id
    AND shelves.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shelves
    WHERE shelves.id = shelf_books.shelf_id
    AND shelves.user_id = auth.uid()
  )
);

-- Policy: Allow users to select books in their own shelves
CREATE POLICY shelf_books_select_policy
ON shelf_books
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shelves
    WHERE shelves.id = shelf_books.shelf_id
    AND shelves.user_id = auth.uid()
  )
);

-- Policy: Allow users to delete books from their own shelves
CREATE POLICY shelf_books_delete_policy
ON shelf_books
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shelves
    WHERE shelves.id = shelf_books.shelf_id
    AND shelves.user_id = auth.uid()
  )
);

-- RPC: Create a new shelf for the user
CREATE OR REPLACE FUNCTION create_shelf(
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS shelves
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO shelves (user_id, name, description)
  VALUES (p_user_id, p_name, p_description)
  RETURNING *;
$$;

-- RPC: Update an existing shelf
CREATE OR REPLACE FUNCTION update_shelf(
  p_shelf_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS shelves
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE shelves
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_shelf_id
  AND user_id = auth.uid()
  RETURNING *;
$$;

-- RPC: Delete a shelf (returns deleted rows)
CREATE OR REPLACE FUNCTION delete_shelf(p_shelf_id UUID)
RETURNS shelves
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM shelves
  WHERE id = p_shelf_id
  AND user_id = auth.uid()
  RETURNING *;
$$;

-- RPC: Add a book to a shelf
CREATE OR REPLACE FUNCTION add_book_to_shelf(
  p_shelf_id UUID,
  p_book_id TEXT,
  p_title TEXT,
  p_author TEXT DEFAULT NULL,
  p_cover_url TEXT DEFAULT NULL,
  p_position INTEGER DEFAULT 0
)
RETURNS shelf_books
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO shelf_books (shelf_id, book_id, title, author, cover_url, position)
  VALUES (p_shelf_id, p_book_id, p_title, p_author, p_cover_url, p_position)
  RETURNING *;
$$;

-- RPC: Remove a book from a shelf (returns deleted row)
CREATE OR REPLACE FUNCTION remove_book_from_shelf(
  p_shelf_id UUID,
  p_book_id TEXT
)
RETURNS shelf_books
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM shelf_books
  WHERE shelf_id = p_shelf_id
  AND book_id = p_book_id
  AND EXISTS (
    SELECT 1 FROM shelves
    WHERE shelves.id = p_shelf_id
    AND shelves.user_id = auth.uid()
  )
  RETURNING *;
$$;

-- RPC: Update a book's position within a shelf (returns updated row)
CREATE OR REPLACE FUNCTION update_book_position(
  p_shelf_id UUID,
  p_book_id TEXT,
  p_position INTEGER
)
RETURNS shelf_books
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE shelf_books
  SET position = p_position,
      updated_at = NOW()
  WHERE shelf_id = p_shelf_id
  AND book_id = p_book_id
  AND EXISTS (
    SELECT 1 FROM shelves
    WHERE shelves.id = p_shelf_id
    AND shelves.user_id = auth.uid()
  )
  RETURNING *;
$$;
