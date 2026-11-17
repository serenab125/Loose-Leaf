/**
 * Shelf service for managing user-created shelves and book collections.
 *
 * All functions use the module-level `supabase` client for direct
 * database access. For use within the Quiz component (which requires
 * a specific client instance), pass the client explicitly instead.
 *
 * @example
 * import { supabase } from '../supabaseClient';
 * const shelves = await fetchUserShelves(supabase, 'user-id');
 */

import { supabase } from '../supabaseClient';

/**
 * PostgREST returns a single JSON object for RPCs that return a composite
 * (table) type, but an array for RPCs that return SETOF. Normalize both.
 */
const firstRow = (data) => {
  if (data === null || data === undefined) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
};

/**
 * The three shelves every account starts with. `is_default` marks them as
 * system-provided: they cannot be deleted, and the app re-creates any that are
 * missing so a user always ends up with all three.
 */
export const DEFAULT_SHELVES = [
  {
    name: 'Current Reads',
    description: 'Books you are reading right now.',
  },
  {
    name: 'Finished',
    description: 'Books you have completed.',
  },
  {
    name: 'Did Not Finish',
    description: 'Books you stopped reading.',
  },
];

/**
 * In-flight seeding promises, keyed by user id, so concurrent callers share a
 * single pass instead of each inserting a full set of default shelves.
 */
const defaultShelfSeeds = new Map();

/**
 * Make sure a user has the three default shelves.
 *
 * Seeds any default shelf whose name the user does not currently have, so the
 * invariant "every account has these three shelves" holds even if one was
 * deleted before the database-level guard shipped. Because matching is by
 * name, renaming a default shelf means its original name reappears on the next
 * load — the three names are part of the product.
 *
 * Concurrent calls share one in-flight promise. React StrictMode mounts
 * effects twice in development, so without this two simultaneous passes would
 * each observe zero defaults and insert a second copy of all three.
 *
 * @param {string} userId
 * @param {object} options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<array>} The user's default shelves
 */
export async function ensureDefaultShelves(userId, { client } = {}) {
  if (!userId) return [];

  const inFlight = defaultShelfSeeds.get(userId);
  if (inFlight) return inFlight;

  const request = seedDefaultShelves(userId, client).finally(() => {
    defaultShelfSeeds.delete(userId);
  });

  defaultShelfSeeds.set(userId, request);
  return request;
}

async function seedDefaultShelves(userId, client) {
  const s = client || supabase;

  const { data: shelves, error } = await s
    .from('shelves')
    .select('id, name, description, is_default, created_at, updated_at')
    .eq('user_id', userId);

  if (error) throw error;

  const names = new Set((shelves || []).map((shelf) => shelf.name));
  const missing = DEFAULT_SHELVES.filter((shelf) => !names.has(shelf.name));

  if (missing.length === 0) {
    return (shelves || []).filter((shelf) => shelf.is_default);
  }

  const { data: created, error: insertError } = await s
    .from('shelves')
    .insert(
      missing.map((shelf) => ({
        user_id: userId,
        name: shelf.name,
        description: shelf.description,
        is_default: true,
      }))
    )
    .select('id, name, description, is_default, created_at, updated_at');

  if (insertError) throw insertError;

  return [
    ...(shelves || []).filter((shelf) => shelf.is_default),
    ...(created || []),
  ];
}

/**
 * Create a new shelf for the current user.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} name - Shelf name (1-200 chars)
 * @param {string} description - Shelf description (optional)
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional, uses module-level)
 * @returns {Promise<object|null>} The created shelf record
 */
export async function createShelf(userId, name, description = '', { client } = {}) {
  if (!userId) return null;
  const s = client || supabase;

  try {
    const { data, error } = await s.rpc('create_shelf', {
      p_user_id: userId,
      p_name: name,
      p_description: description,
    });

    if (error) throw error;
    return firstRow(data);
  } catch (error) {
    console.error('Error creating shelf:', error);
    throw error;
  }
}

/**
 * Update an existing shelf's name or description.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} shelfId - The shelf's unique ID
 * @param {string} name - New shelf name (optional)
 * @param {string} description - New shelf description (optional)
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<object|null>} The updated shelf record
 */
export async function updateShelf(userId, shelfId, name, description, { client } = {}) {
  if (!userId || !shelfId) return null;
  const s = client || supabase;

  try {
    const { data, error } = await s.rpc('update_shelf', {
      p_shelf_id: shelfId,
      p_name: name,
      p_description: description,
    });

    if (error) throw error;
    return firstRow(data);
  } catch (error) {
    console.error('Error updating shelf:', error);
    throw error;
  }
}

/**
 * Delete a user's shelf.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} shelfId - The shelf's unique ID
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<boolean>} True if the shelf was deleted
 */
export async function deleteShelf(userId, shelfId, { client } = {}) {
  if (!userId || !shelfId) return false;
  const s = client || supabase;

  try {
    // delete_shelf returns no row when it refuses the delete (a default
    // shelf), so the returned record — not the absence of an error — is what
    // tells us whether anything was actually removed.
    const { data, error } = await s.rpc('delete_shelf', {
      p_shelf_id: shelfId,
    });

    if (error) throw error;
    return Boolean(firstRow(data));
  } catch (error) {
    console.error('Error deleting shelf:', error);
    throw error;
  }
}

/**
 * Add a book to a shelf.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} shelfId - The shelf's unique ID
 * @param {string} bookId - The book's unique ID (e.g., Open Library ID)
 * @param {string} title - The book's title
 * @param {string} author - The book's author (optional)
 * @param {string} coverUrl - The book's cover URL (optional)
 * @param {number} position - The book's position in the shelf (optional)
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<object|null>} The created shelf_book record
 */
export async function addBookToShelf(
  userId,
  shelfId,
  bookId,
  title,
  author,
  coverUrl,
  position = 0,
  { client } = {}
) {
  if (!userId || !shelfId || !bookId || !title) return null;
  const s = client || supabase;

  try {
    const { data, error } = await s.rpc('add_book_to_shelf', {
      p_shelf_id: shelfId,
      p_book_id: bookId,
      p_title: title,
      p_author: author,
      p_cover_url: coverUrl,
      p_position: position,
    });

    if (error) throw error;
    return firstRow(data);
  } catch (error) {
    console.error('Error adding book to shelf:', error);
    throw error;
  }
}

/**
 * Remove a book from a shelf.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} shelfId - The shelf's unique ID
 * @param {string} bookId - The book's unique ID
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<boolean>} True if the book was removed
 */
export async function removeBookFromShelf(userId, shelfId, bookId, { client } = {}) {
  if (!userId || !shelfId || !bookId) return false;
  const s = client || supabase;

  try {
    const { error } = await s.rpc('remove_book_from_shelf', {
      p_shelf_id: shelfId,
      p_book_id: bookId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing book from shelf:', error);
    throw error;
  }
}

/**
 * Update a book's position within a shelf.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} shelfId - The shelf's unique ID
 * @param {string} bookId - The book's unique ID
 * @param {number} position - The new position (0-based index)
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<boolean>} True if the position was updated
 */
export async function updateBookPosition(userId, shelfId, bookId, position, { client } = {}) {
  if (!userId || !shelfId || !bookId || position === undefined) return false;
  const s = client || supabase;

  try {
    const { error } = await s.rpc('update_book_position', {
      p_shelf_id: shelfId,
      p_book_id: bookId,
      p_position: position,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating book position:', error);
    throw error;
  }
}

/**
 * Fetch all shelves for the current user, ordered by creation date.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<array>} Array of shelf objects
 */
export async function fetchUserShelves(userId, { client } = {}) {
  if (!userId) return [];
  const s = client || supabase;

  try {
    const { data, error } = await s
      .from('shelves')
      .select('id, name, description, is_default, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching shelves:', error);
    throw error;
  }
}

/**
 * Fetch all books in a user's shelf, ordered by position.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} shelfId - The shelf's unique ID
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<array>} Array of shelf_book objects
 */
export async function fetchShelfBooks(userId, shelfId, { client } = {}) {
  if (!userId || !shelfId) return [];
  const s = client || supabase;

  try {
    const { data, error } = await s
      .from('shelf_books')
      .select('id, shelf_id, book_id, title, author, cover_url, position, created_at, updated_at')
      .eq('shelf_id', shelfId)
      .order('position', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching shelf books:', error);
    throw error;
  }
}

/**
 * Fetch a single shelf by ID, ensuring it belongs to the user.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {string} shelfId - The shelf's unique ID
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<object|null>} The shelf record or null
 */
export async function fetchShelf(userId, shelfId, { client } = {}) {
  if (!userId || !shelfId) return null;
  const s = client || supabase;

  try {
    const { data, error } = await s
      .from('shelves')
      .select('id, name, description, is_default, created_at, updated_at')
      .eq('id', shelfId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data || null;
  } catch (error) {
    console.error('Error fetching shelf:', error);
    throw error;
  }
}

/**
 * Fetch all books in a user's shelves, including shelf names.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {object} options - Options
 * @param {object} options.client - Supabase client instance (optional)
 * @returns {Promise<array>} Array of shelf_with_books objects
 */
export async function fetchUserShelvesWithBooks(userId, { client } = {}) {
  if (!userId) return [];

  // Fetch shelves first
  const shelves = await fetchUserShelves(userId, { client });

  // Fetch books for each shelf in parallel
  const shelvesWithBooks = await Promise.all(
    shelves.map(async (shelf) => {
      const books = await fetchShelfBooks(userId, shelf.id, { client });
      return {
        ...shelf,
        books,
        bookCount: books.length,
      };
    })
  );

  return shelvesWithBooks;
}
