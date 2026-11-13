
import { useState } from 'react';
import BookReviews from './BookReviews';
import ReviewModal from './ReviewModal';
import EditReview from './EditReview';


const sampleReviews = [
    {
      id: 1,
      userId: 'demo-user',
      authorName: 'Michaela',
      classification: 'Analytical',
      rating: 5,
      text: "Collins uses the first-person present tense to create an almost cinematic immediacy that mirrors the Capitol's own broadcast. The world-building is economical but effective.",
    },
    {
        id: 2,
        userId: 'maya-user',
        authorName: 'Maya R.',
        classification: 'Analytical',
        rating: 5,
        includesSpoilers: true,
        text: "Katniss is one of the most compelling YA narrators I've ever read. The pacing of the Games is relentless.",
      },
    {
      id: 3,
      userId: 'jordan-user',
      authorName: 'Jordan T.',
      classification: 'Analytical',
      rating: 4,
      text: 'A sharp critique of spectacle culture wrapped in a survival story.',
    },
    {
      id: 4,
      userId: 'ryan-user',
      authorName: 'Ryan K.',
      classification: 'Casual',
      rating: 1,
      includesSpoilers: true,
      text: 'This book kinda sucks ngl',
    },
    {
      id: 5,
      userId: 'leina-user',
      authorName: 'Leina R.',
      classification: 'Casual',
      rating: 2,
      text: 'Katniss was cool but the author had to add the love triangle.',
    },
    {
      id: 6,
      userId: 'riley-user',
      authorName: 'Riley W.',
      classification: 'Casual',
      rating: 4,
      text: "Rue's scene broke me. That's it. That's the review.",
    },
  ];

  
  

export default function ReviewsPreview() {

  const [reviews, setReviews] = useState(sampleReviews);

  const [activeModal, setActiveModal] = useState(null);

  const [editingReview, setEditingReview] = useState(null);

  const handleEdit = (review) => {
    setEditingReview(review);
  };

  const handleDelete = (review) => {
    setActiveModal({ mode: 'delete', review });
  };
  
  const handleSaveEdit = (updatedReview) => {
  setReviews((previousReviews) =>
    previousReviews.map((item) =>
      item.id === updatedReview.id ? updatedReview : item
    )
  );

  setEditingReview(null);
};
  

  
  const handleConfirmDelete = (review) => {
    setReviews((previousReviews) =>
      previousReviews.filter((item) => item.id !== review.id)
    );
  
    setActiveModal(null);
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto', padding: 20 }}>
  {editingReview ? (
    <EditReview
      key={editingReview.id}
      review={editingReview}
      onSave={handleSaveEdit}
      onBack={() => setEditingReview(null)}
    />
  ) : (
    <>
      

      <BookReviews
  reviews={reviews}
  onEdit={handleEdit}
  onDelete={handleDelete}
  loading={false}
error={null}
  currentUserId="demo-user"
/>

<ReviewModal
  review={activeModal?.review}
  mode={activeModal?.mode}
  onClose={() => setActiveModal(null)}
  onSave={handleSaveEdit}
  onDelete={handleConfirmDelete}
    />
    </>
  )}
</div>
);
}
