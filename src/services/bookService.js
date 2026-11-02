import { supabase } from '../supabaseClient';

export async function searchBooksByTitle(title) {
  if (!title || typeof title !== 'string') return [];

  const cleanedTitle = title.replace(/[?/@]/g, '').trim();
  if (!cleanedTitle) return [];

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(cleanedTitle)}&language=eng&limit=25`
    );

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    const validBooks = data.docs
      .filter((doc) => {
        const hasCover = Boolean(doc.cover_i);
        const isPopular = (doc.edition_count && doc.edition_count > 1) || (doc.already_read_count && doc.already_read_count > 0);
        const hasAuthor = doc.author_name && doc.author_name.length > 0;
        return hasCover && hasAuthor && isPopular;
      })
      .slice(0, 10);

    return validBooks.map((doc) => ({
      bookId: doc.key || doc.cover_i || doc.title,
      title: doc.title,
      author: doc.author_name ? doc.author_name[0] : 'Unknown Author',
      coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
    }));
  } catch (error) {
    console.error('Error fetching books in searchBooksByTitle:', error);
    return [];
  }
}

// REAL TRENDING / BOOKTOK BOOKS
export const POPULAR_BOOKTOK_BOOKS = [
  {
    id: 'p1',
    title: 'Fourth Wing',
    author: 'Rebecca Yarros',
    cover: 'https://covers.openlibrary.org/b/id/13444005-L.jpg',
  },
  {
    id: 'p2',
    title: 'A Court of Thorns and Roses',
    author: 'Sarah J. Maas',
    cover: 'https://covers.openlibrary.org/b/id/12818862-L.jpg',
  },
  {
    id: 'p3',
    title: 'It Ends With Us',
    author: 'Colleen Hoover',
    cover: 'https://covers.openlibrary.org/b/id/12648746-L.jpg',
  },
  {
    id: 'p4',
    title: 'Remarkably Bright Creatures',
    author: 'Shelby Van Pelt',
    cover: 'https://covers.openlibrary.org/b/id/12784860-L.jpg',
  },
  {
    id: 'p5',
    title: 'Yesteryear',
    author: 'Caro Claire Burke',
    cover: 'https://covers.openlibrary.org/b/id/14556424-L.jpg',
  },
];

export const RECOMMENDED_FOR_YOU = [
  { id: 'r1', title: 'The Hunger Games', cover: 'https://covers.openlibrary.org/b/id/13254928-L.jpg' },
  { id: 'r2', title: 'The Hobbit', cover: 'https://covers.openlibrary.org/b/id/8406786-L.jpg' },
  { id: 'r3', title: 'One of Us Is Lying', cover: 'https://covers.openlibrary.org/b/id/8381286-L.jpg' },
  { id: 'r4', title: 'Project Hail Mary', cover: 'https://covers.openlibrary.org/b/id/10521270-L.jpg' },
  { id: 'r5', title: 'Percy Jackson', cover: 'https://covers.openlibrary.org/b/id/7984916-L.jpg' },
];

export const SHORT_EASY_READS = [
  { id: 's1', title: 'Wonder', cover: 'https://covers.openlibrary.org/b/id/8231856-L.jpg' },
  { id: 's2', title: 'milk and honey', cover: 'https://covers.openlibrary.org/b/id/8235111-L.jpg' },
  { id: 's3', title: 'The Catcher in the Rye', cover: 'https://covers.openlibrary.org/b/id/8225261-L.jpg' },
  { id: 's4', title: 'Scythe', cover: 'https://covers.openlibrary.org/b/id/8381286-L.jpg' },
];

const SHOW_MAP = {
  'walking-dead': { label: 'The Walking Dead', search: 'zombie apocalypse' },
  'stranger-things': { label: 'Stranger Things', search: 'supernatural mystery' },
  'bridgerton': { label: 'Bridgerton', search: 'regency romance' },
  'last-of-us': { label: 'The Last of Us', search: 'post-apocalyptic' },
  'harry-potter': { label: 'Harry Potter', search: 'magic school' },
  'hunger-games': { label: 'The Hunger Games', search: 'dystopian' },
  'wednesday': { label: 'Wednesday', search: 'gothic mystery' },
  'twilight': { label: 'Twilight', search: 'vampire romance' },
  'percy-jackson': { label: 'Percy Jackson', search: 'greek mythology' },
  'lord-of-the-rings': { label: 'The Lord of the Rings', search: 'epic fantasy' },
  'maze-runner': { label: 'The Maze Runner', search: 'dystopian' },
};

const VIBE_MAP = {
  cozy: { label: 'Cozy & Comforting', search: 'cozy mystery' },
  funny: { label: 'Funny & Light', search: 'humorous fiction' },
  romantic: { label: 'Romantic', search: 'romance' },
  emotional: { label: 'Emotional', search: 'drama' },
  dark: { label: 'Dark & Mysterious', search: 'thriller' },
  exciting: { label: 'Exciting', search: 'adventure' },
  'thought-provoking': { label: 'Thought-provoking', search: 'philosophical fiction' },
};

export async function fetchMultiPersonalizedRecommendations(userId) {
  const sections = [];

  try {
    if (!userId) return sections;

    const { data: profile } = await supabase
      .from('profiles')
      .select('reading_preferences')
      .eq('id', userId)
      .single();

    if (!profile?.reading_preferences) return sections;

    const prefs = profile.reading_preferences;

    // 1. Show/Movie-based section
    if (Array.isArray(prefs['movies-tv']) && prefs['movies-tv'].length > 0) {
      const showId = prefs['movies-tv'][0];
      if (SHOW_MAP[showId]) {
        const { label, search } = SHOW_MAP[showId];
        const books = await searchBooksByTitle(search);
        if (books.length > 0) {
          sections.push({
            title: `Because You Like: ${label}`,
            books,
          });
        }
      }
    }

    // 2. Mood/Vibe-based section
    if (Array.isArray(prefs.vibe) && prefs.vibe.length > 0) {
      const vibeId = prefs.vibe[0];
      if (VIBE_MAP[vibeId]) {
        const { label, search } = VIBE_MAP[vibeId];
        const books = await searchBooksByTitle(search);
        if (books.length > 0) {
          sections.push({
            title: `Match Your Mood: ${label}`,
            books,
          });
        }
      }
    }

    // 3. Genre-based section
    if (Array.isArray(prefs.stories) && prefs.stories.length > 0 && prefs.stories[0] !== 'not-sure') {
      const storyGenre = prefs.stories[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      const books = await searchBooksByTitle(storyGenre);
      if (books.length > 0) {
        sections.push({
          title: `Explore Genre: ${storyGenre}`,
          books,
        });
      }
    }

    return sections;
  } catch (err) {
    console.error('Failed to fetch multi-recommendations:', err);
    return [];
  }
}