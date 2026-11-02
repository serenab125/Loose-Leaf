import { supabase } from '../supabaseClient';

async function requestBookSearch(body) {
  const { data, error } = await supabase.functions.invoke('search-books', {
    body,
  });

  if (error) {
    throw new Error(data?.error || error.message || 'Book search failed.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return Array.isArray(data?.books) ? data.books : [];
}

export function searchBooksByTitle(title) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';

  if (!cleanTitle) {
    return Promise.resolve([]);
  }

  return requestBookSearch({ query: cleanTitle });
}

export function searchBooksByCategory(category) {
  if (typeof category !== 'string' || !category) {
    return Promise.reject(new Error('Choose a search category.'));
  }

  return requestBookSearch({ category });
}

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

// Mapping for specific TV shows / Movies from quiz option IDs to Open Library search keywords and display labels
const SHOW_MAP = {
  'walking-dead': { label: 'The Walking Dead', search: 'World War Z' },
  'stranger-things': { label: 'Stranger Things', search: 'Stranger Things' },
  'bridgerton': { label: 'Bridgerton', search: 'Bridgerton' },
  'last-of-us': { label: 'The Last of Us', search: 'Post Apocalyptic' },
  'harry-potter': { label: 'Harry Potter', search: 'Harry Potter' },
  'hunger-games': { label: 'The Hunger Games', search: 'Hunger Games' },
  'wednesday': { label: 'Wednesday', search: 'Gothic Mystery' },
  'twilight': { label: 'Twilight', search: 'Twilight' },
  'percy-jackson': { label: 'Percy Jackson', search: 'Percy Jackson' },
  'lord-of-the-rings': { label: 'The Lord of the Rings', search: 'Lord of the Rings' },
  'maze-runner': { label: 'The Maze Runner', search: 'Maze Runner' },
};

// Mapping for Moods/Vibes from quiz option IDs
const VIBE_MAP = {
  cozy: { label: 'Cozy & Comforting', search: 'Cozy Mystery' },
  funny: { label: 'Funny & Light', search: 'Humorous Fiction' },
  romantic: { label: 'Romantic', search: 'Romance' },
  emotional: { label: 'Emotional', search: 'Drama' },
  dark: { label: 'Dark & Mysterious', search: 'Thriller' },
  exciting: { label: 'Exciting', search: 'Adventure' },
  'thought-provoking': { label: 'Thought-provoking', search: 'Philosophy Fiction' },
};

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

    const prefs = profile.reading_preferences;

    // 1. Check if user picked favorite Movies/TV Shows (Priority 1 in Figma design)
    if (Array.isArray(prefs['movies-tv']) && prefs['movies-tv'].length > 0) {
      const showId = prefs['movies-tv'][0];
      if (SHOW_MAP[showId]) {
        const { label, search } = SHOW_MAP[showId];
        const books = await searchBooksByTitle(search);
        return {
          category: `Because You Like: ${label}`,
          books: books.length > 0 ? books : DEFAULT_BOOKS,
        };
      }
    }

    // 2. Check if user picked a Vibe (Priority 2 in Figma design)
    if (Array.isArray(prefs.vibe) && prefs.vibe.length > 0) {
      const vibeId = prefs.vibe[0];
      if (VIBE_MAP[vibeId]) {
        const { label, search } = VIBE_MAP[vibeId];
        const books = await searchBooksByTitle(search);
        return {
          category: `Match Your Mood: ${label}`,
          books: books.length > 0 ? books : DEFAULT_BOOKS,
        };
      }
    }

    // 3. Check if user picked specific Story types/genres (Priority 3)
    if (Array.isArray(prefs.stories) && prefs.stories.length > 0 && prefs.stories[0] !== 'not-sure') {
      const storyGenre = prefs.stories[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      const books = await searchBooksByTitle(storyGenre);
      return {
        category: `Because You Like: ${storyGenre}`,
        books: books.length > 0 ? books : DEFAULT_BOOKS,
      };
    }

    // 4. Default Fallback
    return { category: 'Popular Reads', books: DEFAULT_BOOKS };
  } catch (err) {
    console.error('Failed to fetch personalized recommendations:', err);
    return { category: 'Popular Reads', books: DEFAULT_BOOKS };
  }
}
