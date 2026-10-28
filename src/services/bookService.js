import { supabase } from "../supabaseClient";

export async function searchBooksByTitle(title) {
    const { data, error } = await supabase.functions.invoke(
        "search-books", {
            body: { query: title },
        }
    );

    if (error) {
        throw new Error("Book search failed. Please try again.");
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data?.books ?? [];
import { supabase } from "../supabaseClient";

export async function searchBooksByTitle(title) {
    const { data, error } = await supabase.functions.invoke(
        "search-books", {
            body: { query: title },
        }
    );

    if (error) {
        throw new Error("Book search failed. Please try again.");
    }

    if (data?.error) {
        throw new Error(data.error);
    }

    return data?.books ?? [];
}