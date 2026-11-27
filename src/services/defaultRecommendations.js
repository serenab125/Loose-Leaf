import { fetchTrendingBooks } from './bookService';

const book = (id, title, author, coverId) => ({
  bookId: id,
  title,
  author,
  coverUrl: `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`,
});

export const DEFAULT_RECOMMENDATION_SHELVES = [
  {
    title: 'Modern Fiction & BookTok Favorites',
    books: [
      book('OL24912337W', 'Fourth Wing', 'Rebecca Yarros', 13444005),
      book('OL17352669W', 'A Court of Thorns and Roses', 'Sarah J. Maas', 12818862),
      book('OL24222014W', 'Project Hail Mary', 'Andy Weir', 10521270),
      book('OL20600816W', 'The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 10519627),
      book('OL2163649W', 'The Song of Achilles', 'Madeline Miller', 8235327),
      book('OL20653478W', 'The Midnight Library', 'Matt Haig', 10389354),
    ],
  },
  {
    title: 'Page-Turning Thrillers & Mysteries',
    books: [
      book('OL20073399W', 'The Silent Patient', 'Alex Michaelides', 8746794),
      book('OL20631823W', 'The Guest List', 'Lucy Foley', 10186919),
      book('OL20560095W', 'The Maidens', 'Alex Michaelides', 11264015),
      book('OL24339366W', 'The Housemaid', 'Freida McFadden', 12748112),
      book('OL16807780W', 'Gone Girl', 'Gillian Flynn', 7265258),
      book('OL20832541W', 'A Good Girl’s Guide to Murder', 'Holly Jackson', 10128397),
    ],
  },
  {
    title: 'Cozy & Heartwarming Reads',
    books: [
      book('OL25393982W', 'Remarkably Bright Creatures', 'Shelby Van Pelt', 12784860),
      book('OL24383610W', 'Legends & Lattes', 'Travis Baldree', 12650893),
      book('OL20876450W', 'The House in the Cerulean Sea', 'TJ Klune', 10142516),
      book('OL21649356W', 'People We Meet on Vacation', 'Emily Henry', 10772594),
      book('OL20851990W', 'Beach Read', 'Emily Henry', 10113434),
      book('OL25293680W', 'Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 12747171),
    ],
  },
];

async function fetchModernGenreShelf(subject, limit = 16) {
  try {
    const params = new URLSearchParams({
      q: `subject:"${subject}" first_publish_year:[2012 TO 2026] language:eng`,
      sort: 'readinglog',
      fields: 'key,title,author_name,cover_i,first_publish_year',
      limit: String(limit),
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`
    );
    if (!response.ok) return [];

    const data = await response.json();
    const seen = new Set();
    const results = [];

    for (const doc of data.docs ?? []) {
      if (!doc.title || !doc.author_name?.length || !doc.cover_i) continue;
      if (/\b(summary|study guide|workbook|box set|omnibus)\b/i.test(doc.title)) {
        continue;
      }

      const key = `${doc.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${doc.author_name[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        bookId: doc.key.split('/').pop(),
        title: doc.title,
        author: doc.author_name.slice(0, 2).join(', '),
        coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
      });

      if (results.length >= 8) break;
    }

    return results;
  } catch {
    return [];
  }
}

export async function fetchDefaultRecommendationShelves() {
  const shelves = [];
  const usedFingerprints = new Set();

  const dedupeAcrossShelves = (books) =>
    books.filter((item) => {
      const fp = `${String(item.title).toLowerCase().replace(/[^a-z0-9]/g, '')}|${String(item.author).split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      if (usedFingerprints.has(fp)) return false;
      usedFingerprints.add(fp);
      return true;
    });

  // 1. Live Trending Modern Reads
  try {
    const trending = await fetchTrendingBooks();
    const uniqueTrending = dedupeAcrossShelves(trending);
    if (uniqueTrending.length > 0) {
      shelves.push({
        title: 'Trending Right Now',
        books: uniqueTrending.slice(0, 8),
      });
    }
  } catch (err) {
    console.warn('Could not load trending shelf for default home:', err);
  }

  // 2. Curated Modern Shelves (enriched with live modern subject matches when available)
  const liveSubjectMap = {
    'Modern Fiction & BookTok Favorites': 'contemporary fiction',
    'Page-Turning Thrillers & Mysteries': 'psychological thriller',
    'Cozy & Heartwarming Reads': 'contemporary romance',
  };

  for (const fallbackShelf of DEFAULT_RECOMMENDATION_SHELVES) {
    const subject = liveSubjectMap[fallbackShelf.title];
    const liveBooks = subject ? await fetchModernGenreShelf(subject) : [];
    const merged = dedupeAcrossShelves([...fallbackShelf.books, ...liveBooks]);

    if (merged.length > 0) {
      shelves.push({
        title: fallbackShelf.title,
        books: merged.slice(0, 8),
      });
    }
  }

  return shelves;
}