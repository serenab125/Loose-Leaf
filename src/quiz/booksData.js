// src/quiz/booksData.js
// Book database for the "openbook" dataset.

// Book covers, titles, and authors shown in the home screen PNGs.
// These are the "generalized" books that appear when a user skips the quiz.
export const OPENBOOK = {
  books: [
    {
      id: 'the-great-gatsby',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      cover: 'the-great-gatsby',
      description: 'A classic story of love, wealth, and the American Dream.',
    },
    {
      id: 'the-hunger-games',
      title: 'The Hunger Games',
      author: 'Suzanne Collins',
      cover: 'the-hunger-games',
      description: 'A dystopian young adult novel about survival and rebellion.',
    },
    {
      id: 'the-hobbit',
      title: 'The Hobbit',
      author: 'J.R.R. Tolkien',
      cover: 'the-hobbit',
      description: 'A fantasy adventure about a hobbit who finds himself in a dragons\' world.',
    },
    {
      id: 'world-war-z',
      title: 'World War Z',
      author: 'Max Brooks',
      cover: 'world-war-z',
      description: 'An oral history of the zombie war, told through multiple perspectives.',
    },
    {
      id: 'rot-and-ruin',
      title: 'Rot & Ruin',
      author: 'Jonathan Maberry',
      cover: 'rot-and-ruin',
      description: 'A post-apocalyptic young adult novel about a zombie-infested world.',
    },
    {
      id: 'the-forest-of-hands',
      title: 'The Forest of Hands and Teeth',
      author: 'Carrie Ryan',
      cover: 'the-forest-of-hands',
      description: 'A young adult novel set in a world overrun by the unliving.',
    },
  ],
};

// Generalized categories based on the "Because You Like: The Walking Dead" section
export const GENERIC_CATEGORIES = [
  {
    id: 'the-walking-dead-category',
    title: 'The Walking Dead',
    description: 'Post-apocalyptic and zombie-themed titles.',
    books: [
      { id: 'world-war-z', title: 'World War Z', author: 'Max Brooks' },
      { id: 'rot-and-ruin', title: 'Rot & Ruin', author: 'Jonathan Maberry' },
      { id: 'the-forest-of-hands', title: 'The Forest of Hands and Teeth', author: 'Carrie Ryan' },
    ],
  },
];

// Default generalized book layout (used when quiz is skipped)
export const DEFAULT_GENERALIZED_BOOKS = OPENBOOK.books.map((book) => ({
  ...book,
  type: 'covered',
}));

// Export the full openbook database for use in the book service
export const booksDatabase = OPENBOOK;
