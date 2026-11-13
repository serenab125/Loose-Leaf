import { supabase } from '../supabaseClient';

/** Adds a reaction to a specified page of a book */
export async function addBookPageReaction({
  bookId,
  bookTitle,
  pageNumber,
  reaction,
}) {
  const cleanBookId = String(bookId ?? '').trim();
  const cleanBookTitle = String(bookTitle ?? '').trim();
  const cleanReaction = String(reaction ?? '').trim();
  const page = Number(pageNumber);

  if (!cleanBookId || cleanBookId.length > 100) {
    throw new Error('A valid book ID is required.');
  }

  if (!cleanBookTitle || cleanBookTitle.length > 500) {
    throw new Error('A valid book title is required.');
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error('A valid page number is required.');
  }

  if (!cleanReaction || cleanReaction.length > 100) {
    throw new Error('A reaction must be between 1 and 100 characters.');
  }

  const { data, error } = await supabase.rpc('add_book_page_reaction', {
    p_book_id: cleanBookId,
    p_book_title: cleanBookTitle,
    p_page_number: page,
    p_reaction: cleanReaction,
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data;
}

/** Fetches all saved page reactions for a specific book */
export async function fetchBookPageReactions(bookId) {
  const cleanBookId = String(bookId ?? '').trim();
  if (!cleanBookId) return [];

  const { data, error } = await supabase
    .from('book_page_reactions')
    .select('*')
    .eq('book_id', cleanBookId)
    .order('page_number', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}