/**
 * Saved-book service.
 *
 * `saved_books` is the reading-status table behind the Book Detail status
 * dropdown and the Home "Current Read" card. Reads and writes go straight to
 * the table through the user's own RLS policies.
 */

import { supabase } from '../supabaseClient';

/** Maps the Book Detail dropdown labels to stored reading_status values. */
export const READING_STATUSES = {
  'Currently Reading': 'currently_reading',
  Finished: 'finished',
  'Did Not Finish': 'did_not_finish',
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
 * Insert or update the signed-in user's reading status for one book.
 * Uses UPDATE-then-INSERT so it does not depend on a unique constraint.
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
  if (updated && updated.length > 0) return updated[0];

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
  return inserted;
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
