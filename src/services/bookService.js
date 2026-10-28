import { supabase } from '../supabaseClient';

/**
 * Searches Open Library API (and/or local Supabase storage) by title
 * and returns formatted book records.
 */
export async function searchBooksByTitle(title) {
  if (!title || typeof title !== 'string') return [];

  const cleanedTitle = title.replace(/[?/@]/g, '').trim();
  if (!cleanedTitle) return [];

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(cleanedTitle)}&limit=10`
    );

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    return data.docs.map((doc) => ({
      bookId: doc.key || doc.cover_i || doc.title,
      title: doc.title,
      author: doc.author_name ? doc.author_name[0] : 'Unknown Author',
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
    }));
  } catch (error) {
    console.error('Error fetching books in searchBooksByTitle:', error);
    return [];
  }
}

/**
 * Fallback default books list when preferences/recommendations are unavailable.
 */
export const DEFAULT_BOOKS = [
  {
    bookId: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    coverUrl: 'https://covers.openlibrary.org/b/id/8311267-L.jpg',
  },
  {
    bookId: '2',
    title: 'The Hunger Games',
    author: 'Suzanne Collins',
    coverUrl: 'https://covers.openlibrary.org/b/id/13254928-L.jpg',
  },
  {
    bookId: '3',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    coverUrl: 'https://covers.openlibrary.org/b/id/8406786-L.jpg',
  },
];

/**
 * Retrieves personalized book recommendations based on user's Supabase quiz preferences.
 */
export async function fetchPersonalizedRecommendations(userId) {
  try {
    if (!userId) {
      return { category: 'Popular Reads', books: DEFAULT_BOOKS };
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('reading_preferences')
      .eq('id', userId)
      .single();

    if (error || !profile?.reading_preferences) {
      return { category: 'Popular Reads', books: DEFAULT_BOOKS };
    }

    const preferences = profile.reading_preferences;
    const favoriteGenre =
      preferences.favoriteGenre || preferences.genres?.[0] || 'Fiction';

    const books = await searchBooksByTitle(favoriteGenre);

    return {
      category: `Because You Like: ${favoriteGenre}`,
      books: books.length > 0 ? books : DEFAULT_BOOKS,
    };
  } catch (err) {
    console.error('Failed to fetch personalized recommendations:', err);
    return { category: 'Popular Reads', books: DEFAULT_BOOKS };
  }
}