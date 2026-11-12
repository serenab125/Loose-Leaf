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
    return data && data.length > 0 ? data[0] : null;
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
    return data && data.length > 0 ? data[0] : null;
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
    const { error } = await s.rpc('delete_shelf', {
      p_shelf_id: shelfId,
    });

    if (error) throw error;
    return true;
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
    return data && data.length > 0 ? data[0] : null;
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
  const shelves = await fetchUserShelves(userId);

  // Fetch books for each shelf in parallel
  const shelvesWithBooks = await Promise.all(
    shelves.map(async (shelf) => {
      const books = await fetchShelfBooks(userId, shelf.id);
      return {
        ...shelf,
        books,
        bookCount: books.length,
      };
    })
  );

  return shelvesWithBooks;
}
