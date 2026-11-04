

import { useState } from "react";
import "./Search.css";

function BookCover({ book }) {
    const [failed, setFailed] = useState(false);

    const fallbackUrl = book.bookId
        ? `https://covers.openlibrary.org/b/olid/${book.bookId}-M.jpg?default=false`
        : null;

    const coverUrl = book.coverUrl || fallbackUrl;

    return coverUrl && !failed ? (
        <img
            src={coverUrl}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            onError={() => setFailed(true)}
        />
    ) : (
        <div className="search-book-no-cover">
            {book.title || "Cover unavailable"}
        </div>
    );
}

export default function BookRow({ title, books = [] }) {
    return (
        <section className="search-book-section">
            <h2 className="search-book-section-title">{title}</h2>

            <div className="search-book-row">
                {books.map((book, index) => (
                    <div
                        className="search-book-item"
                        key={book.bookId ?? index}
                    >
                        <BookCover book={book} />
                    </div>
                ))}
            </div>
        </section>
    );
}