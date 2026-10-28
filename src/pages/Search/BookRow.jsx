
import "./Search.css";

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
                        {book.coverUrl ? (
                            <img
                                src={book.coverUrl}
                                alt={`Cover of ${book.title}`}
                                loading="lazy"
                            />
                        ) : (
                            <div className="search-book-no-cover">
                                {book.title || "Cover unavailable"}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
