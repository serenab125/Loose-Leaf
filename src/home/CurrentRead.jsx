import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CurrentReadCard from './CurrentReadCard';

export default function CurrentRead({ onNavigateToSearch }) {
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Returns the current read plus any load error, so callers apply the
    // result from a promise callback instead of an effect body.
    const loadCurrentRead = useCallback(async () => {
        try {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError) throw authError;

            if (!user) return { book: null, error: "" };

            const { data, error: queryError } = await supabase
                .from("saved_books")
                .select("open_library_id, title, author, cover_url")
                .eq("user_id", user.id)
                .eq("reading_status", "currently_reading")
                .maybeSingle();

            if (queryError) throw queryError;

            return { book: data ?? null, error: "" };
        } catch (err) {
            console.error("Failed to load current read:", err);
            return { book: null, error: "Failed to load current read." };
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        loadCurrentRead().then((result) => {
            if (cancelled) return;
            setBook(result.book);
            setError(result.error);
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [loadCurrentRead]);

    const handleRetry = async () => {
        setLoading(true);
        setError("");
        const result = await loadCurrentRead();
        setBook(result.book);
        setError(result.error);
        setLoading(false);
    };

    return (
        <div>
            {loading ? (
                <p role="status">Loading current read...</p>
            ) : error ? (
                <div role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={handleRetry}>
                        Retry
                    </button>
                </div>
            ) : (
                <CurrentReadCard
                    book={book}
                    onPickBook={onNavigateToSearch}
                    onContinueReading={() => {
                        console.log('Continue reading:', book);
                    }}
                />
            )}
        </div>
    );
}