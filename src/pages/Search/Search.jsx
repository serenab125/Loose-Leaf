
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
