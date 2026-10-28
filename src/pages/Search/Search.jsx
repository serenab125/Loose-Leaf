import { useEffect, useState } from "react";
import BookRow from "./BookRow";
import { categoryData } from "./categoryData";
import { searchBooksByTitle } from "../../services/bookService";
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

export default function Search() {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [bookRows, setBookRows] = useState([]);
    const [loadingBooks, setLoadingBooks] = useState(false);
    const [booksError, setBooksError] = useState("");

    useEffect(() => {
        const category = categoryData[selectedCategory];

        if (!category) {
            setBookRows([]);
            setBooksError("");
            setLoadingBooks(false);
            return;
        }

        let cancelled = false;

        async function loadBooks() {
            setLoadingBooks(true);
            setBooksError("");
            setBookRows([]);

            try {
                const rows = [];

                for (const row of category.rows) {
                    const books = [];

                    for (const bookInfo of row.books) {
                        const results = await searchBooksByTitle(bookInfo.title);

                        // Prefer an exact title match when available.

                        const normalize = (text) =>
                            text?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";

                        const exactMatches = results.filter(
                            (book) =>
                                normalize(book.title) === normalize(bookInfo.title) &&
                                normalize(book.author).includes(normalize(bookInfo.author))
                        );

                        const match =
                            exactMatches.find((book) => book.coverUrl) ??
                            exactMatches[0];

                        books.push({
                            bookId: match?.bookId ?? bookInfo.title,
                            title: bookInfo.title,
                            author: bookInfo.author,
                            coverUrl: bookInfo.coverUrl ?? match?.coverUrl ?? null,
                        });

                    }

                    rows.push({ title: row.title, books });
                }

                if (!cancelled) setBookRows(rows);
            } catch {
                if (!cancelled) {
                    setBooksError("Could not load recommendations. Please try again.");
                }
            } finally {
                if (!cancelled) setLoadingBooks(false);
            }
        }

        loadBooks();

        return () => {
            cancelled = true;
        };
    }, [selectedCategory]);

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
                        {selectedCategory === "Movies"
                            ? "Books for Movie Lovers"
                            : `${selectedCategory} Books`}
                    </h1>

                    {loadingBooks && <p>Loading recommendations...</p>}

                    {booksError && (
                        <p className="search-results-message">{booksError}</p>
                    )}

                    {!loadingBooks &&
                        !booksError &&
                        bookRows.map((row) => (
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
