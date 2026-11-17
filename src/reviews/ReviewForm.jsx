import { useState } from 'react'
import BookRating from './BookRating'
import './reviews.css'

export default function ReviewForm({
  bookId,
  initialReview = null,
  onSubmit,
  onBack
}) {
  const [rating, setRating] = useState(initialReview?.rating ?? 0)
  const [reviewText, setReviewText] = useState(initialReview?.reviewText ?? '')
  const [reviewType, setReviewType] = useState(() =>
    initialReview?.reviewText?.trim()
      ? initialReview.reviewType ?? 'analytical'
      : 'casual'
  )
  const [includesSpoilers, setIncludesSpoilers] = useState(
    initialReview?.includesSpoilers ?? false
  )

  const hasReviewText = reviewText.trim().length > 0
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!bookId) {
      setError('Book information is missing. Please return to the book page.')
      return
    }

    if (
      !Number.isFinite(rating) ||
      rating < 0.5 ||
      rating > 5 ||
      !Number.isInteger(rating * 2)
    ) {
      setError('Please select a rating between 0.5 and 5 stars.')
      return
    }

    if (typeof onSubmit !== 'function') {
      setError('Review publishing is not connected yet.')
      return
    }

    setSubmitting(true)

    try {
      await onSubmit({
        bookId,
        rating,
        reviewText: reviewText.trim(),
        reviewType: hasReviewText ? reviewType : 'casual',
        includesSpoilers: hasReviewText ? includesSpoilers : false
      })

      setSuccess('Your review was published successfully!')
    } catch (err) {
      setError(err?.message || 'Unable to publish your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="review-form-page">
      <div className="review-form-container">
        <button
          type="button"
          className="review-back-button"
          onClick={onBack}
        >
          <span aria-hidden="true">‹</span> Back to Book
        </button>

        <form onSubmit={handleSubmit} className="review-form">
          <BookRating
            value={rating}
            onChange={setRating}
            disabled={submitting}
          />

          <textarea
            className="review-textarea"
            placeholder="Write a Review (Optional)..."
            aria-label="Write a Review"
            value={reviewText}
            onChange={(event) => {
              const nextText = event.target.value
              setReviewText(nextText)

              if (!nextText.trim()) {
                setReviewType('casual')
                setIncludesSpoilers(false)
              }
            }}
            maxLength={5000}
            disabled={submitting}
          />

          <h2 className="review-type-heading">Describe your review...</h2>

          <div className="review-type-selector">
            <button
              type="button"
              className={`review-type-option ${
                reviewType === 'analytical' ? 'active' : ''
              }`}
              onClick={() => setReviewType('analytical')}
              aria-pressed={reviewType === 'analytical'}
              disabled={submitting || !hasReviewText}
            >
              <strong>Analytical</strong>
              <span>(Lengthy &amp; Detailed)</span>
            </button>

            <button
              type="button"
              className={`review-type-switch ${
                reviewType === 'casual' ? 'casual' : ''
              }`}
              onClick={() =>
                setReviewType((current) =>
                  current === 'analytical' ? 'casual' : 'analytical'
                )
              }
              aria-label="Toggle review type"
              disabled={submitting || !hasReviewText}
            >
              <span className="review-type-knob" />
            </button>

            <button
              type="button"
              className={`review-type-option ${
                reviewType === 'casual' ? 'active' : ''
              }`}
              onClick={() => setReviewType('casual')}
              aria-pressed={reviewType === 'casual'}
              disabled={submitting || !hasReviewText}
            >
              <strong>Casual</strong>
              <span>(Quick Thoughts)</span>
            </button>
          </div>

          <label className="review-spoiler-row">
            <input
              type="checkbox"
              checked={includesSpoilers}
              onChange={(event) => setIncludesSpoilers(event.target.checked)}
              disabled={submitting || !hasReviewText}
            />
            <span className="review-spoiler-switch" aria-hidden="true" />
            <span className={`review-spoiler-label ${
              includesSpoilers ? 'active' : ''
            }`}>
              Includes Spoilers
            </span>
          </label>

          {error && (
            <p className="review-message review-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="review-message review-success" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="review-submit-button"
            disabled={submitting}
          >
            {submitting
              ? 'Saving...'
              : hasReviewText
                ? 'Publish Review'
                : 'Save Rating'}
          </button>
        </form>
      </div>
    </main>
  )
}