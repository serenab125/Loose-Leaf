
import { DEFAULT_BOOKS } from './bookService';
import { searchBooksByTitle } from './bookService';

const book = (id, title, author, coverId) => ({
    bookId: id,
    title,
    author,
    coverUrl: `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`,
});

export const DEFAULT_RECOMMENDATION_SHELVES = [
    {
        title: 'Discover Your Next Read',
        books: [
            ...DEFAULT_BOOKS,
            book('d4', 'Fourth Wing', 'Rebecca Yarros', 13444005),
            book('d5', 'A Court of Thorns and Roses', 'Sarah J. Maas', 12818862),
            book('d6', 'Project Hail Mary', 'Andy Weir', 10521270),
        ],
    },
    {
        title: 'Popular Right Now',
        books: [
            book('p1', 'Fourth Wing', 'Rebecca Yarros', 13444005),
            book('p2', 'A Court of Thorns and Roses', 'Sarah J. Maas', 12818862),
            book('p3', 'It Ends With Us', 'Colleen Hoover', 12648746),
            book('p4', 'Remarkably Bright Creatures', 'Shelby Van Pelt', 12784860),
            book('p5', 'The Hunger Games', 'Suzanne Collins', 13254928),
        ],
    },
    {
        title: 'Short & Easy Reads',
        books: [
            book('s1', 'Wonder', 'R. J. Palacio', 8231856),
            book('s2', 'Milk and Honey', 'Rupi Kaur', 8235111),
            book('s3', 'The Great Gatsby', 'F. Scott Fitzgerald', 8311267),
            book('s4', 'The Catcher in the Rye', 'J. D. Salinger', 8225261),
        ],
    },
];

export async function fetchDefaultRecommendationShelves() {
    return Promise.all(
        DEFAULT_RECOMMENDATION_SHELVES.map(async (shelf) => ({
            ...shelf,
            books: await Promise.all(
                shelf.books.map(async (book) => {
                    try {
                        const results = await searchBooksByTitle(book.title);

                        const match = results.find(
                            (result) =>
                                result.coverUrl &&
                                result.title?.toLowerCase().trim() ===
                                book.title.toLowerCase().trim() &&
                                result.author?.toLowerCase().includes(
                                    book.author.toLowerCase()
                                )
                        );

                        return match ?? book;
                    } catch {
                        return book;
                    }
                })
            ),
        }))
    );
}
