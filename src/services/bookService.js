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

export function searchBooks(query, searchType = 'all') {
  const cleanQuery = typeof query === 'string' ? query.trim() : '';

  if (!cleanQuery) {
    return Promise.resolve([]);
  }

  const allowedSearchTypes = ['all', 'title', 'author', 'genre', 'isbn'];
  if (!allowedSearchTypes.includes(searchType)) {
    return Promise.reject(new Error('Book search type is not supported.'));
  }

  return requestBookSearch({ query: cleanQuery, searchType });
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

/**
 * Record one settled, successful search for an authenticated user.
 * The database stores search terms.
 */
export async function recordPopularSearchTerm(searchTerm, book) {
  if (typeof searchTerm !== 'string' || !searchTerm.trim() || !book?.title) {
    return;
  }

  const { error } = await supabase.rpc('record_popular_search_term', {
    p_search_term: searchTerm.trim(),
    p_book_id: String(book.bookId || book.title).slice(0, 100),
    p_title: String(book.title).slice(0, 500),
    p_author: book.author ? String(book.author).slice(0, 600) : null,
    p_cover_url: book.coverUrl || null,
  });
  if (error) throw error;
}

export async function fetchPopularSearchTerms(limit = 8) {
  const { data, error } = await supabase.rpc('get_popular_search_terms', {
    p_limit: limit,
  });

  if (error) throw error;

  const seenBookIds = new Set();
  return (Array.isArray(data) ? data : []).reduce((books, row) => {
    if (seenBookIds.has(row.book_id)) return books;
    seenBookIds.add(row.book_id);

    books.push({
      bookId: row.book_id,
      title: row.title,
      author: row.author,
      coverUrl: row.cover_url,
      searchCount: row.search_count,
    });
    return books;
  }, []);
}

export const DEFAULT_BOOKS = [
  {
    bookId: '1',
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    cover: 'https://covers.openlibrary.org/b/id/8311267-L.jpg',
    coverUrl: 'https://covers.openlibrary.org/b/id/8311267-L.jpg',
  },
  {
    bookId: '2',
    id: '2',
    title: 'The Hunger Games',
    author: 'Suzanne Collins',
    cover: 'https://covers.openlibrary.org/b/id/13254928-L.jpg',
    coverUrl: 'https://covers.openlibrary.org/b/id/13254928-L.jpg',
  },
  {
    bookId: '3',
    id: '3',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    cover: 'https://covers.openlibrary.org/b/id/8406786-L.jpg',
    coverUrl: 'https://covers.openlibrary.org/b/id/8406786-L.jpg',
  },
];

export const POPULAR_BOOKTOK_BOOKS = [
  {
    id: "it-ends-with-us",
    title: "It Ends with Us",
    author: "Colleen Hoover",
    cover: "https://covers.openlibrary.org/b/id/12818862-L.jpg?default=false",
    coverUrl: "https://covers.openlibrary.org/b/id/12818862-L.jpg?default=false",
  },
  {
    id: "evelyn-hugo",
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    cover: "https://covers.openlibrary.org/b/id/10521270-L.jpg?default=false",
    coverUrl: "https://covers.openlibrary.org/b/id/10521270-L.jpg?default=false",
  },
  {
    id: "fourth-wing",
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    cover: "https://covers.openlibrary.org/b/id/14589201-L.jpg?default=false",
    coverUrl: "https://covers.openlibrary.org/b/id/14589201-L.jpg?default=false",
  },
];

export const RECOMMENDED_FOR_YOU = [
  {
    id: "acotar",
    title: "A Court of Thorns and Roses",
    author: "Sarah J. Maas",
    cover: "https://covers.openlibrary.org/b/id/12818862-L.jpg?default=false",
    coverUrl: "https://covers.openlibrary.org/b/id/12818862-L.jpg?default=false",
  },
  {
    id: "project-hail-mary",
    title: "Project Hail Mary",
    author: "Andy Weir",
    cover: "https://covers.openlibrary.org/b/id/10521270-L.jpg?default=false",
    coverUrl: "https://covers.openlibrary.org/b/id/10521270-L.jpg?default=false",
  },
  {
    id: "silent-patient",
    title: "The Silent Patient",
    author: "Alex Michaelides",
    cover: "https://covers.openlibrary.org/b/id/14589201-L.jpg?default=false",
    coverUrl: "https://covers.openlibrary.org/b/id/14589201-L.jpg?default=false",
  },
];

export const SHORT_EASY_READS = [
  {
    id: "every-heart",
    title: "Every Heart a Doorway",
    author: "Seanan McGuire",
    cover: "https://covers.openlibrary.org/b/id/8311267-L.jpg",
    coverUrl: "https://covers.openlibrary.org/b/id/8311267-L.jpg",
  },
  {
    id: "giver",
    title: "The Giver",
    author: "Lois Lowry",
    cover: "https://covers.openlibrary.org/b/id/13254928-L.jpg",
    coverUrl: "https://covers.openlibrary.org/b/id/13254928-L.jpg",
  },
  {
    id: "outsiders",
    title: "The Outsiders",
    author: "S. E. Hinton",
    cover: "https://covers.openlibrary.org/b/id/8406786-L.jpg",
    coverUrl: "https://covers.openlibrary.org/b/id/8406786-L.jpg",
  },
];

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

    return { category: 'Popular Reads', books: DEFAULT_BOOKS };
  } catch (err) {
    console.error('Failed to fetch personalized recommendations:', err);
    return { category: 'Popular Reads', books: DEFAULT_BOOKS };
  }
}

export async function fetchMultiPersonalizedRecommendations(userId) {
  try {
    const singleRec = await fetchPersonalizedRecommendations(userId);
    return [
      {
        title: singleRec.category,
        books: singleRec.books,
      },
    ];
  } catch {
    return [
      {
        title: 'Popular Reads',
        books: DEFAULT_BOOKS,
      },
    ];
  }
}