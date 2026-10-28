// src/pages/HomeScreen.jsx
// Home screen that displays the OpenBook database recommendations.

import { GENERIC_CATEGORIES, OPENBOOK } from '../quiz/booksData';

export function HomeScreen() {
  return (
    <main>
      <section className="homepage">
        {/* Current Read */}
        <section className="homepage-current-read">
          <h1 className="homepage-current-read__label">Current Read</h1>
          <p className="homepage-current-read__empty">
            You haven&apos;t picked a book yet.
          </p>
          <button type="button" className="homepage-current-read__btn">
            Pick my first book
          </button>
        </section>

        {/* Recommended for You */}
        <section className="homepage-recommendations">
          <h2 className="homepage-section__title">Recommended for You</h2>
          <div className="homepage-recommendations__grid">
            {OPENBOOK.books.map((book) => (
              <article
                key={book.id}
                className="homepage-recommendations__card"
                aria-label={`${book.title} by ${book.author}`}
              >
                <div className="homepage-recommendations__cover">
                  <span className="homepage-recommendations__cover-title">
                    {book.title}
                  </span>
                </div>
                <div className="homepage-recommendations__body">
                  <p className="homepage-recommendations__author">{book.author}</p>
                  <p className="homepage-recommendations__desc">
                    {book.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Because You Like: The Walking Dead */}
        <section className="homepage-category">
          <h2 className="homepage-section__title">
            Because You Like: The Walking Dead
          </h2>
          <div className="homepage-recommendations__grid">
            {GENERIC_CATEGORIES[0].books.map((book) => (
              <article
                key={book.id}
                className="homepage-recommendations__card"
                aria-label={`${book.title} by ${book.author}`}
              >
                <div className="homepage-recommendations__cover">
                  <span className="homepage-recommendations__cover-title">
                    {book.title}
                  </span>
                </div>
                <div className="homepage-recommendations__body">
                  <p className="homepage-recommendations__author">{book.author}</p>
                  <p className="homepage-recommendations__desc">
                    Post-apocalyptic and zombie-themed.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default HomeScreen;
