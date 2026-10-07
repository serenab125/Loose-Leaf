// src/quiz/quizData.js
// Quiz question data structure for the Reading Quiz

export const QUIZ_SECTIONS = [
  {
    id: 'about-you',
    title: 'About You',
    question: 'How would you describe your relationship with reading?',
    type: 'single-select',
    options: [
      { id: 'love-reading', label: 'I love reading', subtitle: 'Always mid-book' },
      { id: 'read-sometimes', label: 'I read sometimes', subtitle: 'When the mood strikes' },
      { id: 'trying-to-read', label: "I'm trying to read more", subtitle: 'Looking for a spark' },
      { id: 'don-t-read', label: "I don't really read", subtitle: "Let's change that gently" },
    ],
  },
  {
    id: 'stories',
    title: 'Stories',
    question: 'Which kinds of stories do you enjoy?',
    type: 'multi-select',
    instructions: 'Pick as many as you like.',
    options: [
      { id: 'fiction', label: 'Fiction', subtitle: 'Made-up stories' },
      { id: 'nonfiction', label: 'Nonfiction', subtitle: 'Real facts & true stories' },
      { id: 'mystery', label: 'Mystery', subtitle: 'Whodunits & puzzles' },
      { id: 'fantasy', label: 'Fantasy', subtitle: 'Imaginative worlds' },
      { id: 'romance', label: 'Romance', subtitle: 'Love stories' },
      { id: 'sci-fi', label: 'Science Fiction', subtitle: 'Futuristic & speculative' },
    ],
  },
  {
    id: 'pacing',
    title: 'Pacing',
    question: 'How do you prefer to read?',
    type: 'single-select',
    options: [
      { id: 'quick-reads', label: 'Quick reads', subtitle: 'Short, fast-paced books' },
      { id: 'deep-dives', label: 'Deep dives', subtitle: 'Long, immersive novels' },
      { id: 'mixed', label: 'A mix', subtitle: 'Whatever the day calls for' },
    ],
  },
];

export const MAX_PROGRESS_STEPS = QUIZ_SECTIONS.length + 1; // +1 for intro
