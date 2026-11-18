
import { useState } from 'react'
import './reviews.css'

// RR-02: Interactive rating with half-star support
export default function BookRating({
  value = 0,
  onChange,
  disabled = false
}) {
  const [hoverRating, setHoverRating] = useState(0)
  const displayRating = hoverRating || value

  const handleRating = (event, star) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientX - rect.left

    // Left half = .5, right half = whole star
    return position < rect.width / 2 ? star - 0.5 : star
  }

  return (
    <div className="book-rating" role="group" aria-label="Rate this book">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(
          0,
          Math.min(100, (displayRating - (star - 1)) * 100)
        )

        return (
          <button
            key={star}
            type="button"
            className="rating-star"
            onMouseMove={(event) => {
              if (!disabled) {
                setHoverRating(handleRating(event, star))
              }
            }}
            onMouseLeave={() => setHoverRating(0)}
            onClick={(event) => {
              if (!disabled) {
                onChange?.(handleRating(event, star))
              }
            }}
            disabled={disabled}
            aria-label={`Rate ${star} stars`}
          >
            <span className="rating-star-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B88A32"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="M12 2.5l2.9 6.1 6.7.9-4.9 4.8 1.2 6.7L12 17.8l-5.9 3.2 1.2-6.7-4.9-4.8 6.7-.9L12 2.5z" />
              </svg>

              <span
                className="rating-star-fill"
                style={{ width: `${fillPercentage}%` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="#B88A32"
                  stroke="#B88A32"
                  strokeWidth="1.7"
                  aria-hidden="true"
                >
                  <path d="M12 2.5l2.9 6.1 6.7.9-4.9 4.8 1.2 6.7L12 17.8l-5.9 3.2 1.2-6.7-4.9-4.8 6.7-.9L12 2.5z" />
                </svg>
              </span>
            </span>
          </button>
        )
      })}

      
    </div>
  )
}
