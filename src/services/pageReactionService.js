import { supabase } from '../supabaseClient';

/** Adds a reaction to a specified chapter of a book */
export async function addBookPageReaction({
  bookId,
  bookTitle,
  chapterNumber,
  reaction,
}) {
  const cleanBookId = String(bookId ?? '').trim();
  const cleanBookTitle = String(bookTitle ?? '').trim();
  const cleanReaction = String(reaction ?? '').trim();
  const chapter = Number(chapterNumber);

  if (!cleanBookId || cleanBookId.length > 100) {
    throw new Error('A valid book ID is required.');
  }

  if (!cleanBookTitle || cleanBookTitle.length > 500) {
    throw new Error('A valid book title is required.');
  }

  if (!Number.isInteger(chapter) || chapter < 1) {
    throw new Error('A valid chapter number is required.');
  }

  if (!cleanReaction || cleanReaction.length > 300) {
    throw new Error('A reaction must be between 1 and 300 characters.');
  }

  // Maps chapterNumber to the database's p_page_number parameter
  const { data, error } = await supabase.rpc('add_book_page_reaction', {
    p_book_id: cleanBookId,
    p_book_title: cleanBookTitle,
    p_page_number: chapter,
    p_reaction: cleanReaction,
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data;
}

/** Fetches all saved chapter reactions for a specific book */
export async function fetchBookPageReactions(bookId) {
  const cleanBookId = String(bookId ?? '').trim();
  if (!cleanBookId) return [];

  const { data, error } = await supabase.rpc(
    'get_unlocked_book_reactions',
    { p_book_id: cleanBookId }
  );

  if (error) throw error;
  return data ?? [];
}

/** Fetches the signed-in user's own chapter reactions (profile page). */
export async function fetchMyBookPageReactions() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return [];

  const { data, error } = await supabase
    .from('book_page_reactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Updates one of the signed-in user's chapter reactions. */
export async function updateBookPageReaction({
  reactionId,
  chapterNumber,
  reaction,
}) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to edit a reaction.');
  }

  const { data, error } = await supabase
    .from('book_page_reactions')
    .update({
      page_number: chapterNumber,
      reaction,
    })
    .eq('id', reactionId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Could not update reaction.');
  }

  return data;
}

/** Deletes one of the signed-in user's chapter reactions. */
export async function deleteBookPageReaction(reactionId) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to delete a reaction.');
  }

  const { error } = await supabase
    .from('book_page_reactions')
    .delete()
    .eq('id', reactionId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message || 'Could not delete reaction.');
  }
}