create table if not exists public.popular_search_terms (
  normalized_term text primary key,
  search_term text not null,
  book_id text not null,
  title text not null,
  author text,
  cover_url text not null,
  search_count bigint not null default 0 check (search_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.popular_search_terms enable row level security;
create index if not exists popular_search_terms_rank_idx
  on public.popular_search_terms (search_count desc, updated_at desc);

-- Searches are written and read only through these authenticated RPC functions.
revoke all on table public.popular_search_terms from public, anon, authenticated;

create or replace function public.record_popular_search_term(
  p_search_term text,
  p_book_id text,
  p_title text,
  p_author text default null,
  p_cover_url text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized text;
  safe_cover_url text := p_cover_url;
begin
  if auth.uid() is null then
    raise exception 'Sign in to contribute to popular searches.';
  end if;

  if p_search_term is null or length(btrim(p_search_term)) < 2 or length(p_search_term) > 120 then
    raise exception 'Search term must be between 2 and 120 characters.';
  end if;

  if p_book_id is null or length(btrim(p_book_id)) = 0 or length(p_book_id) > 100 then
    raise exception 'A valid book ID is required.';
  end if;

  if p_title is null or length(btrim(p_title)) = 0 or length(p_title) > 500 then
    raise exception 'A valid book title is required.';
  end if;

  if safe_cover_url is null or safe_cover_url not like 'https://covers.openlibrary.org/%' then
    raise exception 'A valid Open Library cover URL is required.';
  end if;

  normalized := lower(regexp_replace(btrim(p_search_term), '[[:space:]]+', ' ', 'g'));

  insert into public.popular_search_terms as existing (
    normalized_term,
    search_term,
    book_id,
    title,
    author,
    cover_url,
    search_count,
    updated_at
  )
  values (
    normalized,
    btrim(p_search_term),
    btrim(p_book_id),
    btrim(p_title),
    nullif(left(btrim(p_author), 500), ''),
    safe_cover_url,
    1,
    now()
  )
  on conflict (normalized_term) do update
  set search_term = excluded.search_term,
      book_id = excluded.book_id,
      title = excluded.title,
      author = coalesce(excluded.author, existing.author),
      cover_url = excluded.cover_url,
      search_count = existing.search_count + 1,
      updated_at = now();
end;
$function$;

create or replace function public.get_popular_search_terms(p_limit integer default 8)
returns table (
  book_id text,
  title text,
  author text,
  cover_url text,
  search_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'Sign in to view popular searches.';
  end if;

  return query
  select popular.book_id,
         popular.title,
         popular.author,
         popular.cover_url,
         popular.search_count
  from public.popular_search_terms as popular
  order by popular.search_count desc, popular.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 8), 20));
end;
$function$;

revoke all on function public.record_popular_search_term(text, text, text, text, text) from public, anon;
revoke all on function public.get_popular_search_terms(integer) from public, anon;
grant execute on function public.record_popular_search_term(text, text, text, text, text) to authenticated;
grant execute on function public.get_popular_search_terms(integer) to authenticated;
