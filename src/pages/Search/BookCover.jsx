import { useState } from 'react';

export default function BookCover({
  book,
  imageClassName,
  placeholderClassName,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const alt = `Cover of ${book.title || 'book'}`;

  if (!book.coverUrl || imageFailed) {
    return (
      <span className={placeholderClassName} role="img" aria-label={alt}>
        {book.title || 'Cover unavailable'}
      </span>
    );
  }

  return (
    <img
      src={book.coverUrl}
      alt={alt}
      className={imageClassName}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}
