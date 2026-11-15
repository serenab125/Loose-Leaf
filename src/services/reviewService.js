import { supabase } from '../supabaseClient';

/** Save or update the signed-in user's review for one book. */
export async function saveBookReview({
  bookId,
  bookTitle,
  reviewText,
  ratingOutOf10,
  classification = 'Analytical',
  includesSpoilers = false,
}) {

  const cleanBookId = String(bookId ?? '').trim();
  const cleanBookTitle = String(bookTitle ?? '').trim();
  const cleanReviewText = String(reviewText ?? '').trim();
  const rating = Number(ratingOutOf10);

  if (!cleanBookId || cleanBookId.length > 100) {
    throw new Error('A valid book ID is required.');
  }
  if (!cleanBookTitle || cleanBookTitle.length > 500) {
    throw new Error('A valid book title is required.');
  }
  if (!cleanReviewText || cleanReviewText.length > 5000) {
    throw new Error('Review text must be between 1 and 5000 characters.');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    throw new Error('Choose a whole-number rating from 1 to 10.');
  }

  const { data, error } = await supabase.rpc('save_book_review', {
  p_book_id: cleanBookId,
  p_book_title: cleanBookTitle,
  p_review_text: cleanReviewText,
  p_rating_out_of_10: rating,
  p_review_type: classification,
  p_includes_spoilers: includesSpoilers,
});

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

/** Delete the signed-in user's review for a book. */
export async function deleteBookReview(bookId) {
  const cleanBookId = String(bookId ?? '').trim();

  if (!cleanBookId) {
    throw new Error('A valid book ID is required.');
  }

  const { data, error } = await supabase.rpc('delete_book_review', {
    p_book_id: cleanBookId,
  });

  if (error) throw error;

  if (!data) {
    throw new Error('Review not found or could not be deleted.');
  }

  return true;
}