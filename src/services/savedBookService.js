/**
 * Saved-book service.
 *
 * `saved_books` is the reading-status table behind the Book Detail status
 * dropdown and the Home "Current Read" card. Reads and writes go straight to
 * the table through the user's own RLS policies.
 */

import { supabase } from '../supabaseClient';
import {
  ensureDefaultShelves,
  fetchUserShelvesWithBooks,
  addBookToShelf,
  removeBookFromShelf,
} from './shelfService';

/** Maps the Book Detail dropdown labels to stored reading_status values. */
export const READING_STATUSES = {
  'Currently Reading': 'currently_reading',
  Finished: 'finished',
  'Did Not Finish': 'did_not_finish',
};

/** Maps stored reading_status values to the user's default shelf names. */
const STATUS_TO_DEFAULT_SHELF = {
  currently_reading: 'Current Reads',
  finished: 'Finished',
  did_not_finish: 'Did Not Finish',
};

/** Reverse lookup, for rendering a stored row as a dropdown label. */
export const STATUS_LABELS = Object.entries(READING_STATUSES).reduce(
  (acc, [label, value]) => {
    acc[value] = label;
    return acc;
  },
  {}
);

/**
 * Syncs a book into the default shelf matching `cleanStatus` and removes it
 * from the other two default shelves (leaving custom shelves intact).
 */
async function syncDefaultShelfForStatus({
  userId,
  bookId,
  title,
  author,
  coverUrl,
  statusValue,
}) {
  const targetShelfName = STATUS_TO_DEFAULT_SHELF[statusValue];
  if (!targetShelfName) return;

  await ensureDefaultShelves(userId);
  const shelves = await fetchUserShelvesWithBooks(userId);

  const defaultShelfNames = new Set(Object.values(STATUS_TO_DEFAULT_SHELF));

  for (const shelf of shelves) {
    if (!defaultShelfNames.has(shelf.name)) continue;

    const isOnShelf = (shelf.books || []).some(
      (b) => (b.book_id || b.id) === bookId
    );

    if (shelf.name === targetShelfName && !isOnShelf) {
      await addBookToShelf(userId, shelf.id, bookId, title, author, coverUrl);
    } else if (shelf.name !== targetShelfName && isOnShelf) {
      await removeBookFromShelf(userId, shelf.id, bookId);
    }
  }
}

/**
 * Insert or update the signed-in user's reading status for one book,
 * and sync the corresponding default shelf ("Current Reads", "Finished",
 * or "Did Not Finish").
 */
export async function saveBookStatus({
  userId,
  bookId,
  title,
  author,
  coverUrl,
  status,
}) {
  const cleanUserId = String(userId ?? '').trim();
  const cleanBookId = String(bookId ?? '').trim();
  const cleanTitle = String(title ?? '').trim();
  const cleanStatus = READING_STATUSES[status] ?? String(status ?? '').trim();
  const cleanAuthor = author ? String(author).trim() : null;
  const cleanCover = coverUrl ? String(coverUrl).trim() : null;

  if (!cleanUserId) throw new Error('You must be signed in to save a book.');
  if (!cleanBookId) throw new Error('A valid book ID is required.');
  if (!cleanTitle) throw new Error('A valid book title is required.');
  if (!cleanStatus) throw new Error('Choose a reading status.');

  const { data: updated, error: updateError } = await supabase
    .from('saved_books')
    .update({
      title: cleanTitle,
      author: cleanAuthor,
      cover_url: cleanCover,
      reading_status: cleanStatus,
    })
    .eq('user_id', cleanUserId)
    .eq('open_library_id', cleanBookId)
    .select();

  if (updateError) throw updateError;

  let savedRow = updated && updated.length > 0 ? updated[0] : null;

  if (!savedRow) {
    const { data: inserted, error: insertError } = await supabase
      .from('saved_books')
      .insert({
        user_id: cleanUserId,
        open_library_id: cleanBookId,
        title: cleanTitle,
        author: cleanAuthor,
        cover_url: cleanCover,
        reading_status: cleanStatus,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    savedRow = inserted;
  }

  await syncDefaultShelfForStatus({
    userId: cleanUserId,
    bookId: cleanBookId,
    title: cleanTitle,
    author: cleanAuthor,
    coverUrl: cleanCover,
    statusValue: cleanStatus,
  });

  return savedRow;
}

/** Fetch the signed-in user's saved row for one book, if any. */
export async function fetchSavedBook(userId, bookId) {
  const cleanUserId = String(userId ?? '').trim();
  const cleanBookId = String(bookId ?? '').trim();
  if (!cleanUserId || !cleanBookId) return null;

  const { data, error } = await supabase
    .from('saved_books')
    .select('open_library_id, title, author, cover_url, reading_status')
    .eq('user_id', cleanUserId)
    .eq('open_library_id', cleanBookId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

/** Remove the book from the user's saved list entirely. */
export async function removeSavedBook(userId, bookId) {
  const cleanUserId = String(userId ?? '').trim();
  const cleanBookId = String(bookId ?? '').trim();
  if (!cleanUserId || !cleanBookId) return false;

  const { error } = await supabase
    .from('saved_books')
    .delete()
    .eq('user_id', cleanUserId)
    .eq('open_library_id', cleanBookId);

  if (error) throw error;
  return true;
}

/**
 * Hand over the single "current read" slot.
 *
 * `saved_books` enforces one current read per user (the
 * one_current_read_per_user constraint, matching the Home "Current Read" card),
 * so marking a second book as currently reading requires dropping the previous
 * holder's status first — otherwise the insert fails on the unique index.
 *
 * @param {string} userId
 * @param {string} keepBookId - the book taking the slot
 * @returns {Promise<Array<{bookId: string, title: string}>>} the evicted rows
 */
export async function clearOtherCurrentReads(userId, keepBookId) {
  const cleanUserId = String(userId ?? '').trim();
  const cleanBookId = String(keepBookId ?? '').trim();
  if (!cleanUserId || !cleanBookId) return [];

  const { data, error } = await supabase
    .from('saved_books')
    .delete()
    .eq('user_id', cleanUserId)
    .eq('reading_status', 'currently_reading')
    .neq('open_library_id', cleanBookId)
    .select('open_library_id, title');

  if (error) throw error;

  return (data || []).map((row) => ({
    bookId: row.open_library_id,
    title: row.title,
  }));
}
