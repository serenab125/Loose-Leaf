
import { useState } from 'react';
import './EditReview.css';

export default function EditReview({ review, onSave, onBack }) {
  const [rating, setRating] = useState(
    review?.ratingOutOf10 ?? Math.round((review?.rating ?? 0) * 2)
  );
  const [text, setText] = useState(review?.text ?? '');
  const [classification, setClassification] = useState(
    review?.classification ?? 'Analytical'
  );
  const [includesSpoilers, setIncludesSpoilers] = useState(
    review?.includesSpoilers ?? false
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!text.trim() || rating === 0) return;

    onSave({
      ...review,
      text: text.trim(),
      rating: rating / 2,
      ratingOutOf10: rating,
      classification,
      includesSpoilers,
    });
  };

  return (
    <div className="edit-review-page">
      <button
        type="button"
        className="edit-review-back"
        onClick={onBack}
      >
        ‹ Back to Reviews
      </button>

      <h2>{review ? 'Edit Your Review' : 'Write a Review'}</h2>

      <form onSubmit={handleSubmit}>
        <fieldset className="edit-review-rating">
          <legend>Your Rating</legend>

          <div className="edit-review-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span className="edit-review-star" key={star}>
                <span className="edit-review-star-base">☆</span>
                <span
                  className="edit-review-star-fill"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(1, rating / 2 - (star - 1))
                    ) * 100}%`,
                  }}
                  aria-hidden="true"
                >
                  ★
                </span>

                <button
                  type="button"
                  className="edit-review-star-half"
                  aria-label={`${star - 0.5} stars`}
                  aria-pressed={rating === star * 2 - 1}
                  onClick={() => setRating(star * 2 - 1)}
                />

                <button
                  type="button"
                  className="edit-review-star-full"
                  aria-label={`${star} stars`}
                  aria-pressed={rating === star * 2}
                  onClick={() => setRating(star * 2)}
                />
              </span>
            ))}
          </div>

          <p>{(rating / 2).toFixed(1)} / 5 stars</p>
        </fieldset>

        <label className="edit-review-text-label" htmlFor="edit-review-text">
          Your Review
        </label>

        <textarea
          id="edit-review-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a Review..."
          maxLength={5000}
          rows={6}
          required
        />

        <h3>Describe your review...</h3>

        <div className="edit-review-type">
          <button
            type="button"
            className={classification === 'Analytical' ? 'selected' : ''}
            onClick={() => setClassification('Analytical')}
          >
            Analytical
            <small>Lengthy & Detailed</small>
          </button>

          <button
            type="button"
            className={`edit-review-switch ${
              classification === 'Casual' ? 'casual' : ''
            }`}
            onClick={() =>
              setClassification(
                classification === 'Analytical' ? 'Casual' : 'Analytical'
              )
            }
            aria-label="Toggle review type"
            aria-pressed={classification === 'Casual'}
          >
            <span />
          </button>

          <button
            type="button"
            className={classification === 'Casual' ? 'selected' : ''}
            onClick={() => setClassification('Casual')}
          >
            Casual
            <small>Quick Thoughts</small>
          </button>
        </div>

        <label className="edit-review-spoilers">
          <input
            type="checkbox"
            checked={includesSpoilers}
            onChange={(event) => setIncludesSpoilers(event.target.checked)}
          />
          <span className="edit-review-spoiler-switch" />
          Includes Spoilers
        </label>

        <button
          type="submit"
          className="edit-review-save"
          disabled={!text.trim() || rating === 0}
        >
          {review ? 'Save Changes' : 'Post Review'}
        </button>
      </form>
    </div>
  );
}
