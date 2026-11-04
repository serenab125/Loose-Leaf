import { useRef, useState } from 'react';
import {
  searchBooksByCategory,
  searchBooksByTitle,
  fetchPopularSearchTerms,
  recordPopularSearchTerm,
} from '../../services/bookService';
import BookCover from './BookCover';
import './Search.css';

const TOP_SEARCHES = [
  {
    id: 'acotar',
    title: 'A Court of Thorns and Roses',
    author: 'Sarah J. Maas',
    coverUrl: 'https://covers.openlibrary.org/b/id/12818862-L.jpg?default=false',
  },
  {
    id: 'project-hail-mary',
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    coverUrl: 'https://covers.openlibrary.org/b/id/10521270-L.jpg?default=false',
  },
  {
    id: 'calamity-club',
    title: 'The Calamity Club',
    author: 'Kathryn Stockett',
    coverUrl: 'https://covers.openlibrary.org/b/id/14589201-L.jpg?default=false',
  },
];

const CATEGORIES = [
  { id: 'movies', label: 'Movies' },
  { id: 'tv_shows', label: 'TV Shows' },
  { id: 'under_300_pages', label: '<300 pages' },
  { id: 'over_300_pages', label: '>300 pages' },
  { id: 'series', label: 'Series' },
  { id: 'slow_burn', label: 'Slow Burn' },
];

export default function Search({ onSelectBook }) {
  const [query, setQuery] = useState('');
  const [popularSearches, setPopularSearches] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const requestNumber = useRef(0);
  const searchTimer = useRef(null);
  const popularSearchTimer = useRef(null);
  const isMounted = useRef(false);

  useEffect(() => {
    let active = true;
    isMounted.current = true;

    fetchPopularSearchTerms()
      .then((books) => {
        if (active && books.length > 0) setPopularSearches(books);
      })
      .catch(() => {
        // Keep the sample top searches if popular-search data is unavailable.
        setPopularSearches(TOP_SEARCHES);
      });

    return () => {
      active = false;
      isMounted.current = false;
      clearTimeout(searchTimer.current);
      clearTimeout(popularSearchTimer.current);
    };
  }, []);

  const schedulePopularSearchSave = (searchTerm, books) => {
    const recommendation = books.find((book) => book.coverUrl) || books[0];
    if (!recommendation) return;

    clearTimeout(popularSearchTimer.current);
    popularSearchTimer.current = setTimeout(async () => {
      try {
        await recordPopularSearchTerm(searchTerm, recommendation);
        const updateSearches = await fetchPopularSearchTerms();

        if (ismounted.current && updatedSearches.lenght > 0) {
          setPopularSearches(updatedSearches);
        }
      } catch {
        // Ignore errors when saving popular searches.
      }
    }, 500);
  };

  const runSearch = async ({ title = '', category = null }) => {
    const currentRequest = ++requestNumber.current;
    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const results = category
        ? await searchBooksByCategory(category.label)
        : await searchBooksByTitle(title);

      if (currentRequest !== requestNumber.current) return;
      setSearchResults(results);
      if (!category && title.trim() && results.length >0) {
        schedulePopularSearchSave(title, results);
      }
    } catch {
      if (currentRequest !== requestNumber.current) return;
      setSearchError('Unable to retrieve book results. Please try again.');
    } finally {
      if (currentRequest === requestNumber.current) {
        setSearchLoading(false);
      }
    }
  };

const handleSearchInput = (event) => {
  const value = event.target.value;
  setQuery(value);
  setActiveCategory(null);
  requestNumber.current += 1;
  clearTimeout(searchTimer.current);
  clearTimeout(popularSearchTimer.current);
  setSearchResults([]);
  setSearchError('');

  if (!value.trim()) {
    setSearchLoading(false);
    return;
  }

  setSearchLoading(true);
  const pendingRequest = requestNumber.current;

  searchTimer.current = setTimeout(() => {
    if (pendingRequest === requestNumber.current) {
      runSearch({ title: value });
    }
  }, 350);
};

  const handleCategorySelect = (category) => {
    clearTimeout(searchTimer.current);
    clearTimeout(popularSearchTimer.current);
    setQuery('');
    setActiveCategory(category);
    runSearch({ category });
  };

  const clearSearch = () => {
    clearTimeout(searchTimer.current);
    clearTimeout(popularSearchTimer.current);
    requestNumber.current += 1;
    setQuery('');
    setActiveCategory(null);
    setSearchResults([]);
    setSearchError('');
    setSearchLoading(false);
  };

  const retrySearch = () => {
    if (activeCategory) {
      runSearch({ category: activeCategory });
    } else if (query.trim()) {
      runSearch({ title: query });
    }
  };

  const showingResults = Boolean(query.trim() || activeCategory);

  return (
    <main className="search-page">
      <h1 className="search-logo">LooseLeaf</h1>

      <div className="search-bar-container">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          className="search-input"
          placeholder="Search for a book title, genre, etc."
          value={query}
          onChange={handleSearchInput}
          aria-label="Search books by title"
        />
        {showingResults && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={clearSearch}
            aria-label="Clear search and show categories"
          >
            ✕
          </button>
        )}
      </div>

      {showingResults ? (
        <section className="suggested-section" aria-live="polite">
          <h2 className="section-title">
            {activeCategory ? `Books for ${activeCategory.label}` : 'Suggested Titles'}
          </h2>

          {searchLoading && (
            <p className="search-status-msg">Searching for books...</p>
          )}

          {searchError && (
            <div className="search-error" role="alert">
              <p className="search-status-msg">{searchError}</p>
              <button type="button" onClick={retrySearch}>Retry</button>
            </div>
          )}

          {!searchLoading && !searchError && searchResults.length === 0 && (
            <p className="search-status-msg">
              No books found for {activeCategory?.label || `“${query.trim()}”`}.
            </p>
          )}

          <div className="suggested-list">
            {searchResults.map((book, index) => (
              <button
                type="button"
                key={book.bookId || `${book.title}-${index}`}
                className="suggested-card"
                onClick={() => onSelectBook?.(book)}
              >
                <BookCover
                  book={book}
                  imageClassName="suggested-cover"
                  placeholderClassName="suggested-no-cover"
                />
                <span className="suggested-info">
                  <span className="suggested-title">
                    {book.title || 'Title unavailable'}
                  </span>
                  <span className="suggested-author">
                    by {book.author || 'Unknown author'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="top-searches-section">
            <h2 className="section-title">Top Searches</h2>
            <div className="top-searches-row">
              {(popularSearches.length > 0 ? popularSearches : TOP_SEARCHES).map((book) => (
                <button
                  type="button"
                  key={book.bookId || book.id || book.title}
                  className="top-search-card"
                  onClick={() => onSelectBook?.(book)}
                  aria-label={`Popular search recommendation: ${book.title}`}
                >
                  <BookCover
                    book={book}
                    imageClassName="top-search-cover"
                    placeholderClassName="top-search-no-cover"
                  />
                </button>
              ))}
            </div>
          </section>

          <section className="categories-grid" aria-label="Browse book categories">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className="category-btn"
                onClick={() => handleCategorySelect(category)}
              >
                {category.label}
              </button>
            ))}
          </section>
        </>
      )}
    </main>
  );
}