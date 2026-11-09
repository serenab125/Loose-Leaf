import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CurrentReadCard from './CurrentReadCard';

export default function CurrentRead({ onNavigateToSearch }) {
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
        <div>
            {loading ? (
                <p role="status">Loading current read...</p>
            ) : error ? (
                <div role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={loadCurrentRead}>
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