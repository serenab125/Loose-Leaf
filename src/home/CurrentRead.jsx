
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fetchUserShelvesWithBooks } from '../services/shelfService'
import CurrentReadCard from './CurrentReadCard'

export default function CurrentRead({
  onNavigateToSearch,
  onNavigateToTimer
}) {
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCurrentRead = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()

      if (authError) throw authError

      if (!user) {
        setBook(null)
        return
      }

      // Load Josh's shelves and their saved books
      const shelves = await fetchUserShelvesWithBooks(user.id)

      // Find the default Current Reads shelf
      const currentShelf = shelves.find(
        (shelf) =>
          shelf.is_default &&
          shelf.name === 'Current Reads'
      )

      // Display the first book on that shelf
      const firstBook = currentShelf?.books?.[0] ?? null

      if (firstBook) {
        setBook({
          open_library_id: firstBook.book_id,
          title: firstBook.title,
          author: firstBook.author,
          cover_url: firstBook.cover_url
        })
      } else {
        setBook(null)
      }
    } catch (err) {
      console.error('Failed to load current read:', err)
      setError('Failed to load current read.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCurrentRead()
  }, [loadCurrentRead])

  return (
    <div>
      {loading ? (
        <p role="status">Loading current read...</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadCurrentRead}>
            Retry
          </button>
        </div>
      ) : (
        <CurrentReadCard
          book={book}
          onPickBook={onNavigateToSearch}
          onContinueReading={() => onNavigateToTimer?.(book)}
        />
      )}
    </div>
  )
}
