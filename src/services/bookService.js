import { supabase } from "../supabaseClient";

/** Upgrade Open Library cover URLs to high-resolution (-L.jpg) for crisp cards. */
function upgradeCoverUrl(url) {
  if (!url) return "";
  return String(url).replace(/-[SM]\.jpg/i, "-L.jpg");
}

/** Normalize title + primary author to collapse duplicate editions/variants. */
function getBookFingerprint(book) {
  const cleanTitle = String(book?.title ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // strip "(Edition)", "(Unabridged)", etc.
    .replace(/[:\-–—].*$/, "") // strip subtitles so variants merge
    .replace(/[^a-z0-9]/g, "");

  const primaryAuthor = String(book?.author ?? "")
    .split(",")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return `${cleanTitle}|${primaryAuthor}`;
}

/**
 * Detect children's / juvenile books so they are excluded from homepage
 * recommendations while still allowing manga, manhwa, comics, graphic novels,
 * and YA/adult reads. (Search page uses searchBooksByTitle/Subject directly,
 * so users can still search for children's books anytime.)
 */
export function isChildrensBook(book) {
  const subjects = Array.isArray(book?.subjects)
    ? book.subjects.map((s) => String(s).toLowerCase())
    : [];

  const hasComicOrMangaTag = subjects.some((s) =>
    /\b(manga|manhwa|manhua|webtoon|graphic novel|graphic novels|comics)\b/.test(s)
  );

  // Open Library juvenile / children's subject markers
  const childrensSubjectPattern =
    /\b(juvenile|children'?s|picture books?|board books?|bedtime|early readers?|beginning readers?|preschool|kindergarten|first grade|second grade|third grade|fourth grade|fifth grade|ages 0|ages 1|ages 2|ages 3|ages 4|ages 5|ages 6|ages 7|ages 8|ages 9|ages 10|middle grade|fairy tales|nursery rhymes|coloring books?|activity books?)\b/;

  if (subjects.some((s) => childrensSubjectPattern.test(s))) {
    // Allow manga/manhwa/comics unless explicitly tagged for young children/picture books
    if (
      hasComicOrMangaTag &&
      !subjects.some((s) =>
        /\b(picture books?|board books?|preschool|kindergarten|early readers?|ages [0-8])\b/.test(s)
      )
    ) {
      return false;
    }
    return true;
  }

  // Known children's series & imprint indicators in title / author
  const titleAndAuthor = `${book?.title ?? ""} ${book?.author ?? ""}`.toLowerCase();
  const childrensTitleAuthorPattern =
    /\b(tea stilton|geronimo stilton|diary of a wimpy kid|magic tree house|junie b\.? jones|captain underpants|dog man|dork diaries|goosebumps|berenstain bears|dr\.? seuss|paw patrol|peppa pig|little golden book|step into reading|i can read|ready-to-read|boxcar children|nancy drew|hardy boys|babysitter'?s club|magic school bus|curious george|clifford the big red dog|eric carle|roald dahl|judy blume|beverly cleary)\b/;

  return childrensTitleAuthorPattern.test(titleAndAuthor);
}

/** Filter out study guides, summaries, box sets, children's books, and duplicate editions. */
function filterAndDedupeBooks(books, globalSeen = new Set(), maxCount = 10) {
  const bannedTitlePattern =
    /\b(summary|study guide|analysis|workbook|cliffnotes|sparknotes|box set|boxed set|collection|omnibus|companion|trivia|coloring|sticker|guide to)\b/i;

  const unique = [];

  for (const rawBook of books) {
    if (!rawBook?.title || !rawBook?.author || !rawBook?.coverUrl) continue;
    if (bannedTitlePattern.test(rawBook.title)) continue;
    if (isChildrensBook(rawBook)) continue;

    const fingerprint = getBookFingerprint(rawBook);
    if (!fingerprint || fingerprint.startsWith("|")) continue;
    if (globalSeen.has(fingerprint)) continue;

    globalSeen.add(fingerprint);
    const { subjects: _subjects, ...cleanBook } = rawBook;
    unique.push({
      ...cleanBook,
      coverUrl: upgradeCoverUrl(rawBook.coverUrl),
    });

    if (unique.length >= maxCount) break;
  }

  return unique;
}

const JUVENILE_EXCLUSION_QUERY =
  '-subject:"juvenile fiction" -subject:"children\'s fiction" -subject:"children\'s stories" -subject:"picture books"';

/**
 * Fetch modern, popular books for a given Open Library subject (e.g. "coming of age",
 * "fantasy", "psychological thriller") sorted by reader popularity and filtered
 * to modern releases (2005+) and non-children's titles.
 */
async function fetchModernBooksBySubject(subject, { minYear = 2005, limit = 28 } = {}) {
  const cleanSubject = String(subject ?? "").trim();
  if (!cleanSubject) return [];

  try {
    const params = new URLSearchParams({
      q: `subject:"${cleanSubject}" first_publish_year:[${minYear} TO 2026] language:eng ${JUVENILE_EXCLUSION_QUERY}`,
      sort: "readinglog",
      fields: "key,title,author_name,cover_i,first_publish_year,subject",
      limit: String(limit),
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`
    );

    if (response.ok) {
      const data = await response.json();
      const mapped = (data.docs ?? [])
        .filter((doc) => doc.title && doc.author_name?.length && doc.cover_i)
        .map((doc) => ({
          bookId: doc.key.split("/").pop(),
          title: doc.title,
          author: doc.author_name.slice(0, 2).join(", "),
          coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
          firstPublishYear: doc.first_publish_year,
          subjects: doc.subject ?? [],
        }));

      if (mapped.length > 0) return mapped;
    }
  } catch (err) {
    console.warn(`Modern subject search failed for "${cleanSubject}":`, err);
  }

  // Fallback to Edge Function subject search if direct search fails
  try {
    return await searchBooksBySubject(cleanSubject);
  } catch {
    return [];
  }
}

/**
 * Fetch modern, popular books matching a keyword/franchise/show query
 * (used for Movies/TV inspirations and custom "Other" user entries).
 */
async function fetchModernBooksByKeyword(keyword, { minYear = 2000, limit = 24 } = {}) {
  const cleanKeyword = String(keyword ?? "").trim();
  if (!cleanKeyword) return [];

  try {
    const params = new URLSearchParams({
      q: `${cleanKeyword} first_publish_year:[${minYear} TO 2026] language:eng ${JUVENILE_EXCLUSION_QUERY}`,
      sort: "readinglog",
      fields: "key,title,author_name,cover_i,first_publish_year,subject",
      limit: String(limit),
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`
    );

    if (response.ok) {
      const data = await response.json();
      const mapped = (data.docs ?? [])
        .filter((doc) => doc.title && doc.author_name?.length && doc.cover_i)
        .map((doc) => ({
          bookId: doc.key.split("/").pop(),
          title: doc.title,
          author: doc.author_name.slice(0, 2).join(", "),
          coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
          firstPublishYear: doc.first_publish_year,
          subjects: doc.subject ?? [],
        }));

      if (mapped.length > 0) return mapped;
    }
  } catch (err) {
    console.warn(`Modern keyword search failed for "${cleanKeyword}":`, err);
  }

  try {
    return await searchBooksByTitle(cleanKeyword);
  } catch {
    return [];
  }
}

/** Fetch more books by a specific author (e.g., Cassandra Clare for Shadowhunters). */
async function fetchModernBooksByAuthor(authorName, limit = 16) {
  const cleanAuthor = String(authorName ?? "").trim();
  if (!cleanAuthor) return [];

  try {
    const params = new URLSearchParams({
      q: `author:"${cleanAuthor}" first_publish_year:[2005 TO 2026] language:eng ${JUVENILE_EXCLUSION_QUERY}`,
      sort: "readinglog",
      fields: "key,title,author_name,cover_i,first_publish_year,subject",
      limit: String(limit),
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`
    );
    if (!response.ok) return [];

    const data = await response.json();
    return (data.docs ?? [])
      .filter((doc) => doc.title && doc.author_name?.length && doc.cover_i)
      .map((doc) => ({
        bookId: doc.key.split("/").pop(),
        title: doc.title,
        author: doc.author_name.slice(0, 2).join(", "),
        coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`,
        firstPublishYear: doc.first_publish_year,
        subjects: doc.subject ?? [],
      }));
  } catch {
    return [];
  }
}

/** Extract meaningful genre/trope subjects from matched books to expand similar reads. */
function extractDescriptiveSubjects(books) {
  const ignoredSubjects = new Set([
    "fiction",
    "english",
    "novels",
    "stories",
    "literature",
    "books",
    "reading",
    "new york times bestseller",
    "translations",
    "large type books",
    "protected daisy",
    "accessible book",
    "in library",
    "open library staff picks",
  ]);

  const counts = new Map();

  for (const book of books) {
    for (const rawSubj of book?.subjects ?? []) {
      const clean = String(rawSubj).trim();
      const lower = clean.toLowerCase();
      if (
        clean.length < 4 ||
        clean.length > 35 ||
        ignoredSubjects.has(lower) ||
        /\b(juvenile|children|award|bestseller|translated|adaptation|film|television)\b/.test(lower)
      ) {
        continue;
      }
      counts.set(clean, (counts.get(clean) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([subj]) => subj)
    .slice(0, 3);
}

export async function searchBooksByTitle(title) {
  const { data, error } = await supabase.functions.invoke(
    "search-books", {
    body: { query: title },
  }
  );

  if (error) {
    throw new Error("Book search failed. Please try again.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.books ?? [];
}

export async function searchBooksBySubject(subject) {
  const { data, error } = await supabase.functions.invoke(
    "search-books",
    {
      body: {
        query: subject,
        searchType: "subject",
      },
    }
  );

  if (error || data?.error) {
    throw new Error(data?.error || "Book subject search failed.");
  }

  return (data?.books ?? []).filter(
    (book) => book.title && book.author && book.coverUrl
  );
}

export function cleanBookOverview(description) {
  const rawText =
    typeof description === "string"
      ? description
      : typeof description?.value === "string"
        ? description.value
        : "";

  return rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => {
      const standaloneLink = line.match(
        /^\s*(?:#{1,6}\s*)?\[\s*(.*?)\s*\]\(\s*https?:\/\/[^)]*\)\s*$/i
      );
      return !(standaloneLink && /\bread this book online\b/i.test(standaloneLink[1]));
    })
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi, "$1")
        .replace(/https?:\/\/\S+/gi, "")
    )
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getDescriptionText(description) {
  return cleanBookOverview(description);
}

async function fetchWorkDescription(workId) {
  const response = await fetch(
    `https://openlibrary.org/works/${encodeURIComponent(workId)}.json`
  );

  if (!response.ok) return "";

  const work = await response.json();
  return getDescriptionText(work.description);
}

export async function fetchBookOverview(book) {
  const suppliedDescription = getDescriptionText(book?.description);
  if (suppliedDescription) return suppliedDescription;

  const rawBookId = String(
    book?.bookId || book?.id || book?.open_library_id || ""
  ).trim();
  const workId = rawBookId.match(/(?:\/works\/)?(OL\d+W)$/i)?.[1];

  if (workId) {
    try {
      const description = await fetchWorkDescription(workId);
      if (description) return description;
    } catch (error) {
      console.warn("Could not load the Open Library book overview:", error);
    }
  }

  if (!book?.title) return "";

  try {
    const params = new URLSearchParams({
      title: book.title,
      fields: "key,title,author_name,first_sentence",
      limit: "10",
    });
    if (book.author) params.set("author", book.author);

    const response = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`
    );
    if (!response.ok) return "";

    const result = await response.json();
    const normalize = (value) =>
      String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedTitle = normalize(book.title);
    const matchingWork = (result.docs ?? []).find(
      (candidate) => normalize(candidate.title) === normalizedTitle
    );

    const firstSentence = matchingWork?.first_sentence;
    const searchDescription = Array.isArray(firstSentence)
      ? firstSentence[0]
      : firstSentence;
    if (typeof searchDescription === "string" && searchDescription.trim()) {
      return getDescriptionText(searchDescription);
    }

    const matchedWorkId = matchingWork?.key?.split("/").pop();
    if (matchedWorkId && /^OL\d+W$/i.test(matchedWorkId)) {
      return await fetchWorkDescription(matchedWorkId);
    }
  } catch (error) {
    console.warn("Could not search Open Library for a book overview:", error);
  }

  return "";
}

export async function fetchTrendingBooks() {
  const response = await fetch(
    "https://openlibrary.org/trending/daily.json?limit=35"
  );

  if (!response.ok) {
    throw new Error("Failed to load trending books.");
  }

  const data = await response.json();

  const rawBooks = (data.works ?? [])
    .filter(
      (book) =>
        book.title &&
        book.author_name?.length &&
        book.cover_i &&
        (!book.first_publish_year || book.first_publish_year >= 2000)
    )
    .map((book) => ({
      bookId: book.key.split("/").pop(),
      title: book.title,
      author: book.author_name.slice(0, 2).join(", "),
      coverUrl: `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg?default=false`,
      subjects: book.subject ?? [],
    }));

  return filterAndDedupeBooks(rawBooks, new Set(), 10);
}

// Cover lookups are cached so a book with no stored cover is only searched
// once per session, no matter how many times the Home tab remounts.
const coverLookupCache = new Map();

/**
 * Best-effort cover lookup from Open Library's search API.
 */
export async function resolveOpenLibraryCover(title, author) {
  const cleanTitle = String(title ?? '').trim();
  if (!cleanTitle) return null;

  const cleanAuthor = String(author ?? '').trim();
  const cacheKey = `${cleanTitle.toLowerCase()}|${cleanAuthor.toLowerCase()}`;

  if (coverLookupCache.has(cacheKey)) return coverLookupCache.get(cacheKey);

  try {
    const params = new URLSearchParams({ title: cleanTitle, limit: '1' });
    if (cleanAuthor) params.set('author', cleanAuthor);

    const response = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`
    );
    if (!response.ok) throw new Error('Cover lookup failed');

    const data = await response.json();
    const coverId = data?.docs?.[0]?.cover_i;
    const url = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`
      : null;

    coverLookupCache.set(cacheKey, url);
    return url;
  } catch (error) {
    console.warn('Cover lookup failed:', error);
    coverLookupCache.set(cacheKey, null);
    return null;
  }
}

export const DEFAULT_BOOKS = [
  {
    bookId: 'OL24912337W',
    title: 'Fourth Wing',
    author: 'Rebecca Yarros',
    coverUrl: 'https://covers.openlibrary.org/b/id/13444005-L.jpg',
  },
  {
    bookId: 'OL17352669W',
    title: 'A Court of Thorns and Roses',
    author: 'Sarah J. Maas',
    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-L.jpg',
  },
  {
    bookId: 'OL24222014W',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    coverUrl: 'https://covers.openlibrary.org/b/id/10521270-L.jpg',
  },
];

// Mapping for Stories / Genre quiz IDs -> proper Open Library subjects (NOT title searches)
const STORY_MAP = {
  romance: { label: 'Romance', subject: 'contemporary romance' },
  mystery: { label: 'Mystery', subject: 'mystery fiction' },
  fluff: { label: 'Lighthearted & Sweet', subject: 'romantic comedy' },
  fantasy: { label: 'Fantasy', subject: 'fantasy fiction' },
  comedy: { label: 'Comedy', subject: 'humorous fiction' },
  drama: { label: 'Drama', subject: 'contemporary fiction' },
  adventure: { label: 'Adventure', subject: 'adventure fiction' },
  'true-crime': { label: 'True Crime', subject: 'true crime' },
  angst: { label: 'Emotional & Dramatic', subject: 'young adult drama' },
  thriller: { label: 'Thriller', subject: 'psychological thriller' },
  horror: { label: 'Horror', subject: 'horror fiction' },
  'sci-fi': { label: 'Sci-Fi', subject: 'science fiction' },
  historical: { label: 'Historical Fiction', subject: 'historical fiction' },
  'coming-of-age': { label: 'Coming-of-Age', subject: 'coming of age' },
  nonfiction: { label: 'Nonfiction', subject: 'biography and memoir' },
};

// Mapping for specific TV shows / Movies from quiz option IDs to subjects & labels
const SHOW_MAP = {
  'walking-dead': { label: 'The Walking Dead', subject: 'post-apocalyptic fiction' },
  'stranger-things': { label: 'Stranger Things', subject: 'supernatural thriller' },
  'bridgerton': { label: 'Bridgerton', subject: 'regency romance' },
  'last-of-us': { label: 'The Last of Us', subject: 'dystopian survival' },
  'harry-potter': { label: 'Harry Potter', subject: 'magic school fantasy' },
  'hunger-games': { label: 'The Hunger Games', subject: 'dystopian young adult' },
  'wednesday': { label: 'Wednesday', subject: 'gothic mystery' },
  'you': { label: 'You', subject: 'psychological suspense' },
  'outer-banks': { label: 'Outer Banks', subject: 'young adult mystery' },
  'gilmore-girls': { label: 'Gilmore Girls', subject: 'small town fiction' },
  'greys-anatomy': { label: "Grey's Anatomy", subject: 'medical fiction' },
  'criminal-minds': { label: 'Criminal Minds', subject: 'crime thriller' },
  'summer-turned-pretty': { label: 'The Summer I Turned Pretty', subject: 'summer romance' },
  'twilight': { label: 'Twilight', subject: 'paranormal romance' },
  'percy-jackson': { label: 'Percy Jackson', subject: 'mythology fantasy' },
  'lord-of-the-rings': { label: 'The Lord of the Rings', subject: 'epic fantasy' },
  'maze-runner': { label: 'The Maze Runner', subject: 'young adult science fiction' },
  'gossip-girl': { label: 'Gossip Girl', subject: 'young adult drama' },
  'heartstopper': { label: 'Heartstopper', subject: 'lgbtq young adult romance' },
  'never-have-i-ever': { label: 'Never Have I Ever', subject: 'coming of age' },
  'friends': { label: 'Friends', subject: 'friendship fiction' },
  'new-girl': { label: 'New Girl', subject: 'romantic comedy' },
  'modern-family': { label: 'Modern Family', subject: 'family humor' },
  'office': { label: 'The Office', subject: 'humorous fiction' },
  'black-mirror': { label: 'Black Mirror', subject: 'speculative fiction' },
  'breaking-bad': { label: 'Breaking Bad', subject: 'crime fiction' },
  'good-place': { label: 'The Good Place', subject: 'philosophical fiction' },
  'queens-gambit': { label: "The Queen's Gambit", subject: 'historical drama' },
  'interstellar': { label: 'Interstellar', subject: 'space exploration science fiction' },
};

// Mapping for Moods/Vibes from quiz option IDs -> Open Library subjects
const VIBE_MAP = {
  cozy: { label: 'Cozy & Comforting', subject: 'cozy mystery' },
  funny: { label: 'Funny & Light', subject: 'humorous fiction' },
  romantic: { label: 'Romantic', subject: 'contemporary romance' },
  emotional: { label: 'Emotional', subject: 'family saga' },
  dark: { label: 'Dark & Mysterious', subject: 'dark suspense' },
  exciting: { label: 'Exciting', subject: 'action thriller' },
  'thought-provoking': { label: 'Thought-provoking', subject: 'literary fiction' },
};

/**
 * Helper to fetch a full shelf (8-10 books) matching a user-typed show, movie,
 * series, or custom tag:
 * 1. Searches directly by keyword & subject for the custom term.
 * 2. Pulls additional modern books by the matched series/author (e.g., Cassandra Clare
 *    when the user types "Shadowhunters").
 * 3. Expands into the top descriptive subjects of those matches (e.g., urban fantasy,
 *    paranormal romance) so the shelf always has plenty of relevant books.
 */
async function searchBooksForCustomMedia(customTitle) {
  const clean = String(customTitle ?? '').trim();
  if (!clean) return [];

  const [keywordMatches, subjectMatches] = await Promise.all([
    fetchModernBooksByKeyword(clean, { minYear: 2000, limit: 20 }),
    fetchModernBooksBySubject(clean, { minYear: 2005, limit: 20 }),
  ]);

  const combined = [...keywordMatches, ...subjectMatches];

  // Filter out children's books right away so we can accurately count usable hits
  const validInitial = filterAndDedupeBooks(
    combined.map((b) => ({ ...b })),
    new Set(),
    12
  );

  // If we already have plenty of direct matches, return them
  if (validInitial.length >= 8) {
    return combined;
  }

  // Otherwise, expand using the matched book's author (other books in the universe/by same author)
  // AND the matched book's top descriptive subjects (similar vibe/subgenre)
  const topHit = combined.find((b) => !isChildrensBook(b) && b.author);
  const topAuthor = topHit?.author?.split(',')[0]?.trim();
  const relatedSubjects = extractDescriptiveSubjects(
    combined.filter((b) => !isChildrensBook(b))
  );

  const expansionPromises = [];

  if (topAuthor) {
    expansionPromises.push(fetchModernBooksByAuthor(topAuthor, 16));
  }

  for (const subj of relatedSubjects.slice(0, 2)) {
    expansionPromises.push(
      fetchModernBooksBySubject(subj, { minYear: 2008, limit: 16 })
    );
  }

  // If no direct hit gave subjects (e.g. a brand-new TV show), do a broad fiction keyword search
  if (expansionPromises.length === 0) {
    expansionPromises.push(
      fetchModernBooksByKeyword(`${clean} novel`, { minYear: 2005, limit: 20 })
    );
  }

  const expandedGroups = await Promise.all(expansionPromises);
  for (const group of expandedGroups) {
    combined.push(...group);
  }

  return combined;
}

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

    // 0. Check custom user-typed Movies/TV Shows from "Other"
    const customShows = Array.isArray(prefs['movies-tv-other'])
      ? prefs['movies-tv-other'].map((s) => String(s).trim()).filter(Boolean)
      : [];

    if (customShows.length > 0) {
      const customLabel = customShows[0];
      const rawBooks = await searchBooksForCustomMedia(customLabel);
      const books = filterAndDedupeBooks(rawBooks, new Set(), 8);
      if (books.length > 0) {
        return {
          category: `Because You Like: ${customLabel}`,
          books,
        };
      }
    }

    // 1. Check preset favorite Movies/TV Shows
    if (Array.isArray(prefs['movies-tv']) && prefs['movies-tv'].length > 0) {
      const showId = prefs['movies-tv'].find((id) => id !== 'other' && id !== 'not-sure');
      if (showId && SHOW_MAP[showId]) {
        const { label, subject } = SHOW_MAP[showId];
        const rawBooks = await fetchModernBooksBySubject(subject);
        const books = filterAndDedupeBooks(rawBooks, new Set(), 8);
        return {
          category: `Because You Like: ${label}`,
          books: books.length > 0 ? books : DEFAULT_BOOKS,
        };
      }
    }

    // 2. Check preset Vibe
    if (Array.isArray(prefs.vibe) && prefs.vibe.length > 0) {
      const vibeId = prefs.vibe.find((id) => id !== 'other' && id !== 'surprise');
      if (vibeId && VIBE_MAP[vibeId]) {
        const { label, subject } = VIBE_MAP[vibeId];
        const rawBooks = await fetchModernBooksBySubject(subject);
        const books = filterAndDedupeBooks(rawBooks, new Set(), 8);
        return {
          category: `Match Your Mood: ${label}`,
          books: books.length > 0 ? books : DEFAULT_BOOKS,
        };
      }
    }

    // 3. Check Story types/genres using subject search (never title search)
    const customStories = Array.isArray(prefs['stories-other'])
      ? prefs['stories-other'].map((s) => String(s).trim()).filter(Boolean)
      : [];
    if (customStories.length > 0) {
      const rawBooks = await searchBooksForCustomMedia(customStories[0]);
      const books = filterAndDedupeBooks(rawBooks, new Set(), 8);
      if (books.length > 0) {
        return {
          category: `Because You Like: ${customStories[0]}`,
          books,
        };
      }
    }

    if (Array.isArray(prefs.stories) && prefs.stories.length > 0) {
      const storyId = prefs.stories.find((id) => id !== 'not-sure' && id !== 'other');
      if (storyId) {
        const mappedStory = STORY_MAP[storyId];
        const label = mappedStory
          ? mappedStory.label
          : storyId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const subject = mappedStory ? mappedStory.subject : storyId.replace(/-/g, ' ');

        const rawBooks = await fetchModernBooksBySubject(subject);
        const books = filterAndDedupeBooks(rawBooks, new Set(), 8);
        return {
          category: `Because You Like: ${label}`,
          books: books.length > 0 ? books : DEFAULT_BOOKS,
        };
      }
    }

    // 4. Default Fallback
    return { category: 'Popular Reads', books: DEFAULT_BOOKS };
  } catch (err) {
    console.error('Failed to fetch personalized recommendations:', err);
    return { category: 'Popular Reads', books: DEFAULT_BOOKS };
  }
}

export async function fetchMultiPersonalizedRecommendations(userId) {
  const sections = [];
  // Track every book shown across shelves so the homepage has zero duplicates
  const globalSeenBooks = new Set();

  const pushUniqueShelf = (title, rawBooks) => {
    const cleanBooks = filterAndDedupeBooks(rawBooks, globalSeenBooks, 10);
    if (cleanBooks.length > 0) {
      sections.push({ title, books: cleanBooks });
    }
  };

  try {
    if (!userId) return sections;

    const { data: profile } = await supabase
      .from('profiles')
      .select('reading_preferences')
      .eq('id', userId)
      .single();

    if (!profile?.reading_preferences) return sections;

    const prefs = profile.reading_preferences;

    // 0. Custom shows/movies typed under "Other" in Question 4
    const customShows = Array.isArray(prefs['movies-tv-other'])
      ? prefs['movies-tv-other'].map((s) => String(s).trim()).filter(Boolean)
      : [];

    for (let i = 0; i < customShows.length; i += 1) {
      const customLabel = customShows[i];
      const books = await searchBooksForCustomMedia(customLabel);
      pushUniqueShelf(
        i === 0
          ? `Because You Like: ${customLabel}`
          : `More Like: ${customLabel}`,
        books
      );
    }

    // 1. Preset Favorite Movies / TV Shows (uses curated subjects, not title words)
    const presetShowIds = Array.isArray(prefs['movies-tv'])
      ? prefs['movies-tv'].filter((id) => id !== 'other' && id !== 'not-sure')
      : [];

    for (let i = 0; i < Math.min(presetShowIds.length, 3); i += 1) {
      const match = SHOW_MAP[presetShowIds[i]];
      if (!match) continue;
      const books = await fetchModernBooksBySubject(match.subject);
      const prefix =
        i === 0 && customShows.length === 0 ? 'Because You Like' : 'More Like';
      pushUniqueShelf(`${prefix}: ${match.label}`, books);
    }

    // 2. Story Genres (uses STORY_MAP subjects so "Coming-of-Age" returns real books in the genre)
    const customStories = Array.isArray(prefs['stories-other'])
      ? prefs['stories-other'].map((s) => String(s).trim()).filter(Boolean)
      : [];
    for (const customStory of customStories.slice(0, 2)) {
      const books = await searchBooksForCustomMedia(customStory);
      pushUniqueShelf(`Explore Genre: ${customStory}`, books);
    }

    const presetStoryIds = Array.isArray(prefs.stories)
      ? prefs.stories.filter((id) => id !== 'not-sure' && id !== 'other')
      : [];

    for (const storyId of presetStoryIds.slice(0, 3)) {
      const mappedStory = STORY_MAP[storyId];
      const label = mappedStory
        ? mappedStory.label
        : storyId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const subject = mappedStory ? mappedStory.subject : storyId.replace(/-/g, ' ');

      const books = await fetchModernBooksBySubject(subject);
      pushUniqueShelf(`Explore Genre: ${label}`, books);
    }

    // 3. Moods / Vibes
    const customVibes = Array.isArray(prefs['vibe-other'])
      ? prefs['vibe-other'].map((s) => String(s).trim()).filter(Boolean)
      : [];
    for (const customVibe of customVibes.slice(0, 2)) {
      const books = await searchBooksForCustomMedia(customVibe);
      pushUniqueShelf(`Match Your Mood: ${customVibe}`, books);
    }

    const presetVibeIds = Array.isArray(prefs.vibe)
      ? prefs.vibe.filter((id) => id !== 'other' && id !== 'surprise')
      : [];

    for (let i = 0; i < Math.min(presetVibeIds.length, 2); i += 1) {
      const match = VIBE_MAP[presetVibeIds[i]];
      if (!match) continue;
      const books = await fetchModernBooksBySubject(match.subject);
      const prefix = i === 0 ? 'Match Your Mood' : 'Another Mood';
      pushUniqueShelf(`${prefix}: ${match.label}`, books);
    }

    // 4. Add a modern Trending shelf at the bottom so the user always has fresh releases
    try {
      const trending = await fetchTrendingBooks();
      pushUniqueShelf('Trending Modern Reads', trending);
    } catch (err) {
      console.warn('Could not append trending shelf:', err);
    }

    return sections;
  } catch (err) {
    console.error('Failed to fetch multi-recommendations:', err);
    return sections;
  }
}

/** Fetches a book's synopsis/overview from Open Library if missing */
export async function fetchBookDescription(book) {
  if (book?.description && String(book.description).trim()) {
    return String(book.description).trim();
  }

  const rawId = String(
    book?.bookId || book?.id || book?.open_library_id || ''
  ).trim();
  const workKey = rawId.startsWith('/works/')
    ? rawId
    : rawId.startsWith('OL') && rawId.endsWith('W')
      ? `/works/${rawId}`
      : null;

  try {
    if (workKey) {
      const res = await fetch(`https://openlibrary.org${workKey}.json`);
      if (res.ok) {
        const data = await res.json();
        const desc =
          typeof data.description === 'string'
            ? data.description
            : data.description?.value;
        if (desc && desc.trim()) return desc.trim();
      }
    }

    if (book?.title) {
      const query = encodeURIComponent(
        `${book.title} ${book.author || ''}`.trim()
      );
      const searchRes = await fetch(
        `https://openlibrary.org/search.json?q=${query}&limit=1`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const firstWorkKey = searchData.docs?.[0]?.key;
        if (firstWorkKey) {
          const workRes = await fetch(
            `https://openlibrary.org${firstWorkKey}.json`
          );
          if (workRes.ok) {
            const workData = await workRes.json();
            const desc =
              typeof workData.description === 'string'
                ? workData.description
                : workData.description?.value;
            if (desc && desc.trim()) return desc.trim();
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch book description:', err);
  }

  return '';
}