const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Search for books using the Open Library API.
 * Expects a POST request with a JSON body containing a "query" field.
 * Returns a JSON response with an array of books or an error message.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Use POST to search for books." },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const { query } = await req.json();

    if (typeof query !== "string" || !query.trim()) {
      return Response.json(
        { error: "Enter a book title to search." },
        { status: 400, headers: corsHeaders },
      );
    }

    const params = new URLSearchParams({
      title: query.trim(),
      fields: "key,title,author_name,cover_i",
      limit: "10",
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`,
    );

    if (!response.ok) {
      return Response.json(
        { error: "Open Library is unavailable right now. Please try again." },
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
    }) => ({
      // Example: /works/OL123W becomes OL123W
      bookId: book.key?.split("/").pop() ?? null,
      title: book.title ?? null,
      author: book.author_name?.join(", ") ?? null,
      coverUrl: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg?default=false`
        : null,
    }));

    return Response.json(
      { books },
      { headers: corsHeaders },
    );
  } catch {
    return Response.json(
      { error: "Could not reach Open Library. Check your connection and retry." },
      { status: 502, headers: corsHeaders },
    );
  }
});