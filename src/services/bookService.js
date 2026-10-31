import { supabase } from '../supabaseClient';

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