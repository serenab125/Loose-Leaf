import { useEffect, useRef, useState } from 'react';
import './ReviewModal.css';

export default function ReviewModal({
  review,
  mode,
  onClose,
  onSave,
  onDelete,
}) {
  const [text, setText] = useState(review?.text ?? '');
  const dialogRef = useRef(null);

  useEffect(() => {
    setText(review?.text ?? '');
  }, [review]);

  useEffect(() => {
    if (!review) return;

    dialogRef.current?.focus();

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [review, onClose]);

  if (!review) return null;

  const isDelete = mode === 'delete';

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isDelete) {
      onDelete(review);
    } else if (text.trim()) {
      onSave(review, text.trim());
    }
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="review-modal-close"
          onClick={onClose}
          aria-label="Close popup"
        >
          ×
        </button>

        <h2 id="review-modal-title">
          {isDelete ? 'Delete Review?' : 'Edit Your Review'}
        </h2>

        {isDelete ? (
          <p>
            Are you sure you want to delete your review?
            This action cannot be undone.
          </p>
        ) : (
          <p>Make changes to your review below.</p>
        )}

        <form onSubmit={handleSubmit}>
          {!isDelete && (
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={5000}
              rows={5}
              aria-label="Review text"
              required
            />
          )}

          <div className="review-modal-buttons">
            <button
              type="button"
              className="review-modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={
                isDelete
                  ? 'review-modal-delete'
                  : 'review-modal-save'
              }
              disabled={!isDelete && !text.trim()}
            >
              {isDelete ? 'Delete Review' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}