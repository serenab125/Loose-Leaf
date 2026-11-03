import { useRef, useState } from 'react';
import {
  searchBooksByCategory,
  searchBooksByTitle,
} from '../../services/bookService';
import BookCover from './BookCover';
import './Search.css';

import { useEffect, useState } from "react";
import BookRow from "./BookRow";
import { categoryData } from "./categoryData";
import { searchBooksByTitle } from "../../services/bookService";
import "./Search.css";

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
const normalize = (text) =>
    (text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const coverCache = new Map();

async function findBookCover(bookInfo) {
    // Use manually assigned covers without making an API request.
    if (bookInfo.coverUrl) {
        return { ...bookInfo, bookId: bookInfo.title };
    }

    const cacheKey = `${bookInfo.title}|${bookInfo.author}`;

    if (coverCache.has(cacheKey)) {
        return coverCache.get(cacheKey);
    }

    let book = {
        bookId: bookInfo.title,
        title: bookInfo.title,
        author: bookInfo.author,
        coverUrl: null,
    };

    try {
        const results = await searchBooksByTitle(bookInfo.title);

        const exactMatches = results.filter(
            (result) =>
                normalize(result.title) === normalize(bookInfo.title) &&
                normalize(result.author).includes(normalize(bookInfo.author))
        );

        const match =
            exactMatches.find((result) => result.coverUrl) ??
            exactMatches[0];

        if (match) {
            book = {
                ...book,
                bookId: match.bookId ?? bookInfo.title,
                coverUrl: match.coverUrl ?? null,
            };
        }
    } catch (error) {
        console.warn(`Could not load cover for ${bookInfo.title}`, error);
    }

    if (book.coverUrl) {
        coverCache.set(cacheKey, book);
    }

    return book;
}

export default function Search() {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookRows, setBookRows] = useState([]);
    const [loadingBooks, setLoadingBooks] = useState(false);

export default function Search({ onSelectBook }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const requestNumber = useRef(0);

  const runSearch = async ({ title = '', category = null }) => {
    const currentRequest = ++requestNumber.current;
    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);
        if (!category) {
            setBookRows([]);
            setLoadingBooks(false);
            return;
        }

    try {
      const results = category
        ? await searchBooksByCategory(category.id)
        : await searchBooksByTitle(title);

      // Ignore an older request if the user has typed or selected something else.
      if (currentRequest !== requestNumber.current) return;
      setSearchResults(results);
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

    if (!value.trim()) {
      requestNumber.current += 1;
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    runSearch({ title: value });
  };

  const handleCategorySelect = (category) => {
    setQuery('');
    setActiveCategory(category);
    runSearch({ category });
  };

  const clearSearch = () => {
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
        async function loadBooks() {
            setLoadingBooks(true);

            // Display all curated books immediately, even before covers load.
            setBookRows(
                category.rows.map((row) => ({
                    title: row.title,
                    books: row.books.map((book) => ({
                        ...book,
                        bookId: book.title,
                        coverUrl: book.coverUrl ?? null,
                    })),
                }))
            );

            // Load up to 4 book covers at a time.
            const tasks = category.rows.flatMap((row, rowIndex) =>
                row.books.map((bookInfo, bookIndex) => ({
                    bookInfo,
                    rowIndex,
                    bookIndex,
                }))
            );

            const worker = async () => {
                while (tasks.length > 0 && !cancelled) {
                    const task = tasks.shift();
                    if (!task) break;

                    const book = await findBookCover(task.bookInfo);

                    if (cancelled) return;

                    setBookRows((previousRows) =>
                        previousRows.map((row, rowIndex) =>
                            rowIndex !== task.rowIndex
                                ? row
                                : {
                                    ...row,
                                    books: row.books.map((existing, bookIndex) =>
                                        bookIndex === task.bookIndex
                                            ? book
                                            : existing
                                    ),
                                }
                        )
                    );
                }
            };

            await Promise.all(
                Array.from({ length: 4 }, () => worker())
            );

            if (!cancelled) setLoadingBooks(false);
        }

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
              {TOP_SEARCHES.map((book) => (
                <button
                  type="button"
                  key={book.id}
                  className="top-search-card"
                  onClick={() => onSelectBook?.(book)}
                  aria-label={`Select ${book.title}`}
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
                    <h1 className="search-results-title">
                        {categoryData[selectedCategory]?.heading}
                    </h1>

                    {loadingBooks && (
                        <p className="search-results-message">
                            Loading book covers...
                        </p>
                    )}

                    {bookRows.map((row) => (
                        <BookRow
                            key={row.title}
                            title={row.title}
                            books={row.books}
                        />
                    ))}
                </>
            ) : (
                <>
                    <h1 className="search-logo">LooseLeaf</h1>

                    {/* Teammates' search features will go here */}
                    <div className="search-placeholder">
                        Search bar and Top Searches coming soon
                    </div>

                    <div className="search-categories">
                        {categories.map((category) => (
                            <button
                                key={category}
                                type="button"
                                className="search-category-button"
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </main>
    );
}
