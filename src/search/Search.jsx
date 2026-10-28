import React, { useState } from 'react';
import styles from './Search.module.css';
import { supabase } from '../supabaseClient';

const MOCK_TOP_SEARCHES = [
  { id: '1', title: 'A Court of Thorns and Roses', cover: 'https://covers.openlibrary.org/b/id/12833521-L.jpg' },
  { id: '2', title: 'Project Hail Mary', cover: 'https://covers.openlibrary.org/b/id/10521270-L.jpg' },
  { id: '3', title: 'The Calamity Club', cover: 'https://covers.openlibrary.org/b/id/14589201-L.jpg' }
];

const CATEGORY_TAGS = [
  { id: 'movies', label: 'Movies', title: 'Books for Movie Lovers' },
  { id: 'tv_shows', label: 'TV Shows', title: 'Books for TV Fans' },
  { id: 'under_300', label: '< 300 Pages', title: 'Quick & Easy Reads' },
  { id: 'over_300', label: '> 300 Pages', title: 'Deep Dive Reads' },
  { id: 'series', label: 'Series', title: 'Binge-Worthy Book Series' },
  { id: 'slow_burn', label: 'Slow Burn', title: 'Slow Burn Favorites' },
  { id: 'romance', label: 'Romance', title: 'Romance Collection' },
  { id: 'thriller', label: 'Thriller', title: 'Edge of Your Seat Thrillers' }
];

export function Search({ onSelectBook }) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handles real-time search query changes
  const handleQueryChange = async (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clean out invalid characters per acceptance criteria (?, /, @)
    const cleanedValue = value.replace(/[?/@]/g, '').trim();

    if (!cleanedValue) {
      setSearchResults([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Query Supabase 'books' table first (or fallback to Open Library API if empty)
      const { data, error: dbError } = await supabase
        .from('books')
        .select('*')
        .ilike('title', `%${cleanedValue}%`)
        .limit(8);

      if (!dbError && data && data.length > 0) {
        setSearchResults(data);
      } else {
        // API Fallback
        const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(cleanedValue)}&limit=8`);
        const apiData = await res.json();

        if (apiData.docs && apiData.docs.length > 0) {
          const books = apiData.docs.map((doc) => ({
            id: doc.key,
            title: doc.title,
            author: doc.author_name ? doc.author_name[0] : 'Unknown Author',
            cover: doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
              : 'https://via.placeholder.com/80x120?text=No+Cover'
          }));
          setSearchResults(books);
        } else {
          setSearchResults([]);
          setError('No books found with that title.');
        }
      }
    } catch (err) {
      console.error('Search fetch error:', err);
      setError('Unable to fetch books right now.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setError('');
  };

  return (
    <div className={styles.searchPage}>
      {/* Search Bar Header */}
      <header className={styles.searchHeader}>
        {!selectedCategory && <h1 className={styles.brandTitle}>LooseLeaf</h1>}

        <div className={styles.searchBarWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search for a book title, genre, etc."
            value={query}
            onChange={handleQueryChange}
          />
          {query && (
            <button type="button" className={styles.clearBtn} onClick={clearSearch}>
              ✕
            </button>
          )}
        </div>
      </header>

      {/* STATE 1: Live Suggested Titles Search Mode */}
      {query.trim().length > 0 ? (
        <section className={styles.suggestedSection}>
          <h2 className={styles.sectionTitle}>Suggested Titles</h2>
          {loading && <p className={styles.statusText}>Searching for books...</p>}
          {error && <p className={styles.errorNotice}>{error}</p>}

          <div className={styles.resultsList}>
            {searchResults.map((book) => (
              <div 
                key={book.id} 
                className={styles.suggestedCard}
                onClick={() => onSelectBook?.(book)}
              >
                <img src={book.cover || book.cover_url} alt={book.title} className={styles.miniCover} />
                <div className={styles.bookInfo}>
                  <h3 className={styles.bookTitle}>{book.title}</h3>
                  <p className={styles.bookAuthor}>by {book.author || book.author_name || 'Unknown'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : selectedCategory ? (
        /* STATE 2: Category Selected Mode (Search Page 4) */
        <section className={styles.categoryDetailSection}>
          <button type="button" className={styles.backButton} onClick={() => setSelectedCategory(null)}>
            ← Back
          </button>
          <h2 className={styles.categoryHeroTitle}>{selectedCategory.title}</h2>

          <div className={styles.categoryRowGroup}>
            <div className={styles.rowBlock}>
              <h3 className={styles.rowTitle}>Books That Became Movies</h3>
              <div className={styles.horizontalScroll}>
                {MOCK_TOP_SEARCHES.map((book) => (
                  <img key={book.id} src={book.cover} alt={book.title} className={styles.categoryCover} />
                ))}
              </div>
            </div>

            <div className={styles.rowBlock}>
              <h3 className={styles.rowTitle}>Books That Feel Like Your Favorite Movies</h3>
              <div className={styles.horizontalScroll}>
                {MOCK_TOP_SEARCHES.map((book) => (
                  <img key={book.id} src={book.cover} alt={book.title} className={styles.categoryCover} />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* STATE 3: Default Search Landing Page (Search Page 3) */
        <section className={styles.landingSection}>
          <div className={styles.topSearchesBlock}>
            <h2 className={styles.sectionTitle}>Top Searches</h2>
            <div className={styles.horizontalScroll}>
              {MOCK_TOP_SEARCHES.map((book) => (
                <div key={book.id} className={styles.topSearchCard}>
                  <img src={book.cover} alt={book.title} className={styles.topSearchCover} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Category Buttons Grid */}
          <div className={styles.categoryGrid}>
            {CATEGORY_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={styles.categoryBtn}
                onClick={() => setSelectedCategory(tag)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}