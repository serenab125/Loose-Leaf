
import { useEffect, useRef, useState } from "react";
import BookRow from "./BookRow";
import BookCover from "./BookCover";
import { categoryData } from "./categoryData";
import {
    searchBooksByTitle,
    fetchTrendingBooks,
  } from "../../services/bookService";
  import "./Search.css";

const categories = [
    "Movies",
    "TV Shows",
    "< 300 Pages",
    "> 300 Pages",
    "Series",
    "Slow Burn",
    "Romance",
    "Thriller",
];

const TOP_SEARCHES = [
    {
        id: "acotar",
        title: "A Court of Thorns and Roses",
        author: "Sarah J. Maas",
        coverUrl: "https://covers.openlibrary.org/b/id/12818862-L.jpg?default=false",
    },
    {
        id: "project-hail-mary",
        title: "Project Hail Mary",
        author: "Andy Weir",
        coverUrl: "https://covers.openlibrary.org/b/id/10521270-L.jpg?default=false",
    },
    {
        id: "calamity-club",
        title: "The Calamity Club",
        author: "Kathryn Stockett",
        coverUrl: "https://covers.openlibrary.org/b/id/14589201-L.jpg?default=false",
    },
];

const normalize = (text) =>
    (text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const coverCache = new Map();

async function findBookCover(bookInfo) {
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

export default function Search({ onSelectBook }) {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookRows, setBookRows] = useState([]);
    const [loadingBooks, setLoadingBooks] = useState(false);
    const [trendingBooks, setTrendingBooks] = useState(TOP_SEARCHES);

    const [query, setQuery] = useState("");
    const [submittedQuery, setSubmittedQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");
    const requestNumber = useRef(0);

    useEffect(() => {
        let cancelled = false;
      
        async function loadTrendingBooks() {
          try {
            const books = await fetchTrendingBooks();
      
            if (!cancelled && books.length > 0) {
              setTrendingBooks(books);
            }
          } catch (error) {
            console.warn("Could not load trending books:", error);
          }
        }
      
        loadTrendingBooks();
      
        return () => {
          cancelled = true;
        };
      }, []);

    useEffect(() => {
        const category = categoryData[selectedCategory];

        if (!category) {
            setBookRows([]);
            setLoadingBooks(false);
            return;
        }

        let cancelled = false;

        async function loadBooks() {
            setLoadingBooks(true);

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

        loadBooks();

        return () => {
            cancelled = true;
        };
    }, [selectedCategory]);

    useEffect(() => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            requestNumber.current += 1;
            setSearchResults([]);
            setSearchError("");
            setSearchLoading(false);
            return;
        }

        const currentRequest = ++requestNumber.current;

        setSearchLoading(true);
        setSearchError("");
        setSearchResults([]);

        // Wait briefly so we don't request books on every keystroke.
        const timeout = setTimeout(async () => {
            try {
                const results = await searchBooksByTitle(trimmedQuery);

                if (currentRequest !== requestNumber.current) return;

                setSearchResults(results);
            } catch (error) {
                if (currentRequest !== requestNumber.current) return;

                console.error("Book search failed:", error);
                setSearchError("Unable to retrieve books. Please try again.");
            } finally {
                if (currentRequest === requestNumber.current) {
                    setSearchLoading(false);
                }
            }
        }, 350);

        return () => clearTimeout(timeout);
    }, [query]);

    const clearSearch = () => {
        requestNumber.current += 1;
        setQuery("");
        setSearchResults([]);
        setSearchError("");
        setSearchLoading(false);
    };

    const showingResults = Boolean(query.trim());

    return (
        <main className="search-page">
            {selectedCategory ? (
                <>
                    <button
                        type="button"
                        className="search-back-button"
                        onClick={() => setSelectedCategory(null)}
                    >
                        ← Back
                    </button>

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
                    {submittedQuery ? (
  <div className="search-submitted-header">
    <button
      type="button"
      className="search-back-button"
      onClick={() => setSubmittedQuery("")}
    >
      ← Back
    </button>

    <h1 className="search-results-title">
      Search Results for "{submittedQuery}"
    </h1>
  </div>
) : (
  <h1 className="search-logo">LooseLeaf</h1>
)}

                    <div className="search-bar-container">
                        <span className="search-icon" aria-hidden="true">
                            🔍
                        </span>

                        <input
                            type="search"
                            className="search-input"
                            placeholder="Search for a book title..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={async (event) => {
                                if (event.key !== "Enter" || !query.trim()) return;
                              
                                event.preventDefault();
                                setSubmittedQuery(query.trim());
                              
                                const currentRequest = ++requestNumber.current;
                                setSearchLoading(true);
                                setSearchError("");
                              
                                try {
                                  const results = await searchBooksByTitle(query.trim());
                              
                                  if (currentRequest === requestNumber.current) {
                                    setSearchResults(results);
                                  }
                                } catch (error) {
                                  if (currentRequest === requestNumber.current) {
                                    setSearchError("Unable to retrieve books. Please try again.");
                                  }
                                } finally {
                                  if (currentRequest === requestNumber.current) {
                                    setSearchLoading(false);
                                  }
                                }
                              }}
                            aria-label="Search books by title"
                        />

                        {showingResults && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={clearSearch}
                                aria-label="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {showingResults ? (
                        <section className="suggested-section" aria-live="polite">
                            <h2 className="section-title">
  {submittedQuery ? "Search Results" : "Suggested Titles"}
</h2>

                            {searchLoading && (
                                <p className="search-status-msg">
                                    Searching for books...
                                </p>
                            )}

                            {searchError && (
                                <div className="search-error" role="alert">
                                    <p className="search-status-msg">
                                        {searchError}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setQuery(query + " ")}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {!searchLoading &&
                                !searchError &&
                                searchResults.length === 0 && (
                                    <p className="search-status-msg">
                                        No books found for "{query.trim()}".
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
                                                {book.title || "Title unavailable"}
                                            </span>
                                            <span className="suggested-author">
                                                by {book.author || "Unknown author"}
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
                                {trendingBooks.slice(0, 3).map((book) => (
                                        <button
                                            type="button"
                                            key={book.id}
                                            className="top-search-card"
                                            onClick={() => {
                                                setQuery(book.title);
                                            }}
                                            aria-label={`Search for ${book.title}`}
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
                </>
            )}
        </main>
    );
}
