const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// These are deliberate Open Library search queries for the category buttons.
// Page-count categories use Open Library's indexed work-level page-count median.
const categoryQueries: Record<string, string> = {
  movies: 'subject:film adaptations',
  tv_shows: 'subject:television',
  under_300_pages: 'subject:fiction AND number_of_pages_median:[1 TO 299]',
  over_300_pages: 'subject:fiction AND number_of_pages_median:[301 TO *]',
  series: 'subject:series',
  slow_burn: 'subject:slow burn',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Use POST to search for books.' },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const category = typeof body?.category === 'string' ? body.category : '';

    const params = new URLSearchParams({
      fields: 'key,title,author_name,cover_i,number_of_pages_median',
      limit: category ? '24' : '10',
    });

    if (category) {
      const categoryQuery = categoryQueries[category];

      if (!categoryQuery) {
        return Response.json(
          { error: 'That search category is not supported.' },
          { status: 400, headers: corsHeaders },
        );
      }

      params.set('q', categoryQuery);
    } else {
      if (!query) {
        return Response.json(
          { error: 'Enter a book title to search.' },
          { status: 400, headers: corsHeaders },
        );
      }

      params.set('title', query);
    }

    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`,
      { signal: AbortSignal.timeout(10000) },
    );

    if (!response.ok) {
      return Response.json(
        { error: 'Open Library is unavailable right now. Please try again.' },
        { status: 502, headers: corsHeaders },
      );
    }

    const result = await response.json();
    const docs = Array.isArray(result.docs) ? result.docs : [];

    const books = docs.map((book: {
      key?: string;
      title?: string;
      author_name?: string[];
      cover_i?: number;
      number_of_pages_median?: number;
    }) => ({
      bookId: book.key?.split('/').pop() ?? null,
      title: book.title ?? null,
      author: book.author_name?.join(', ') ?? null,
      coverId: book.cover_i ?? null,
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg?default=false`
        : null,
      pageCount: book.number_of_pages_median ?? null,
    }));

    return Response.json({ books }, { headers: corsHeaders });
  } catch {
    return Response.json(
      { error: 'Could not reach Open Library. Check your connection and retry.' },
      { status: 502, headers: corsHeaders },
    );
  }
});
