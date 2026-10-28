import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function CurrentRead() {
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadCurrentRead = useCallback(async () =>{
        setLoading(true);
        setError("");

        try {
            const{
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();
            
            if (authError) throw authError;

            if (!user) {
                setBook(null);
                return;
            }

            const { data, error: queryError } = await supabase
            .from("saved_books")
            .select("open_library_id, title, author, cover_url")
            .eq("user_id", user.id)
            .eq("reading_status", "currently_reading")
            .maybeSingle();

            if (queryError) throw queryError;

            setBook(data);
        } catch {
            setError("Failed to load current read.");
        } finally{
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCurrentRead();
    }, [loadCurrentRead]);

    return (
        <section className="current-read" aria-labelledby="current-read-heading">
            <h2 id="current-read-heading">Currently Reading</h2>

            {loading && <p>Loading current read...</p>}

            {!loading && error && (
                <div role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={loadCurrentRead}>
                        Retry
                    </button>
                </div>
            )}

            {!loading && !error && !book &&(
                <div className="current-read-empty">
                    <div className="Book-cover-placeholder" aria-hidden="true" />
                    <a href="/search">Add a book</a>
                </div>
            )}

            {!loading && !error && book && (
                <article className="current-read-book">
                    <img
                        src={book.cover_url || "/images/book-placeholder.png"}
                        alt={`Cover of ${book.title || "book"}`}
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = "/images/book-placeholder.png";
                        }}
                    />
                    <div>
                        <h3>{book.title || "Title unavailable"}</h3>
                        <p>{book.author || "Author unavailable"}</p>
                    </div>
                </article>
            )}
    </section>
  );
}