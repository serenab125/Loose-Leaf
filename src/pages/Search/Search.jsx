import { useState } from "react";
import { searchBooksByTitle } from "../../services/bookService";
import "./Search.css";

const TOP_SEARCHES = [
    {
        id: 1,
        title: "A Court of Thorns and Roses",
        author: "Sarah J. Maas",
        coverUrl: "https://covers.openlibrary.org/b/id/12818862-L.jpg"
    },
    {
        id: 2,
        title: "Project Hail Mary",
        author: "Andy Weir",
        coverUrl: "https://covers.openlibrary.org/b/id/10521270-L.jpg"
    },
    {
        id: 3,
        title: "The Calamity Club",
        author: "Kathryn Stockett",
        coverUrl: "https://covers.openlibrary.org/b/id/14589201-L.jpg"
    }
];

const CATEGORIES = [
    "Movies",
    "TV Shows",
    "<300 pages",
    ">300 pages",
    "Series",
    "Slow Burn"
];

export default function Search({ onSelectBook }) {
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");

    const handleSearchInput = async (e) => {
        const val = e.target.value;
        setQuery(val);

        const cleanedQuery = val.replace(/[?/@]/g, "").trim();

        if (!cleanedQuery) {
            setSearchResults([]);
            setSearchError("");
            return;
        }

        setSearchLoading(true);
        setSearchError("");

        try {
            const results = await searchBooksByTitle(cleanedQuery);
            if (results && results.length > 0) {
                setSearchResults(results);
            } else {
                setSearchResults([]);
                setSearchError("No book titles found matching your search.");
            }
        } catch {
            setSearchError("Unable to retrieve book results. Please try again.");
        } finally {
            setSearchLoading(false);
        }
    };

    const clearSearch = () => {
        setQuery("");
        setSearchResults([]);
        setSearchError("");
    };

    return (
        <main className="search-page">
            <h1 className="search-logo">LooseLeaf</h1>

            <div className="search-bar-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for a book title, genre, etc."
                    value={query}
                    onChange={handleSearchInput}
                />
                {query && (
                    <button type="button" className="search-clear-btn" onClick={clearSearch}>
                        ✕
                    </button>
                )}
            </div>

            {query.trim().length > 0 ? (
                <section className="suggested-section">
                    <h2 className="section-title">Suggested Titles</h2>

                    {searchLoading && <p className="search-status-msg">Searching for books...</p>}
                    {searchError && <p className="search-status-msg">{searchError}</p>}

                    <div className="suggested-list">
                        {searchResults.map((book, idx) => (
                            <div
                                key={book.bookId || idx}
                                className="suggested-card"
                                onClick={() => onSelectBook?.(book)}
                            >
                                {book.coverUrl ? (
                                    <img src={book.coverUrl} alt={book.title} className="suggested-cover" />
                                ) : (
                                    <div className="suggested-no-cover">{book.title}</div>
                                )}
                                <div className="suggested-info">
                                    <h3 className="suggested-title">{book.title}</h3>
                                    <p className="suggested-author">by {book.author || "Unknown"}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <>
                    <section className="top-searches-section">
                        <h2 className="section-title">Top Searches</h2>
                        <div className="top-searches-row">
                            {TOP_SEARCHES.map((book) => (
                                <div
                                    key={book.id}
                                    className="top-search-card"
                                    onClick={() => onSelectBook?.(book)}
                                >
                                    <img src={book.coverUrl} alt={book.title} className="top-search-cover" />
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="categories-grid">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                className="category-btn"
                                onClick={() => {
                                    setQuery(cat);
                                    handleSearchInput({ target: { value: cat } });
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </section>
                </>
            )}
        </main>
    );
}
