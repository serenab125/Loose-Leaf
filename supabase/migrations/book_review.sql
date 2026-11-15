create table if not exists public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null check (length(btrim(book_id)) between 1 and 100),
  book_title text not null check (length(btrim(book_title)) between 1 and 500),
  review_text text not null check (length(btrim(review_text)) between 1 and 5000),
  rating_out_of_10 smallint not null check (rating_out_of_10 between 1 and 10),
  rating_stars numeric(2, 1)
    generated always as (rating_out_of_10::numeric / 2) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_reviews_one_per_user_book unique (user_id, book_id)
);

alter table public.book_reviews enable row level security;

-- Clients save through the authenticated RPC; direct table access stays disabled.
revoke all on table public.book_reviews from public, anon, authenticated;

create or replace function public.save_book_review(
  p_book_id text,
  p_book_title text,
  p_review_text text,
  p_rating_out_of_10 integer
)
returns table (
  id uuid,
  book_id text,
  book_title text,
  review_text text,
  rating_out_of_10 smallint,
  rating_stars numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in before saving a review.';
  end if;

  if p_book_id is null or length(btrim(p_book_id)) not between 1 and 100 then
    raise exception 'A valid book ID is required.';
  end if;

  if p_book_title is null or length(btrim(p_book_title)) not between 1 and 500 then
    raise exception 'A valid book title is required.';
  end if;

  if p_review_text is null or length(btrim(p_review_text)) not between 1 and 5000 then
    raise exception 'Review text must be between 1 and 5000 characters.';
  end if;

  if p_rating_out_of_10 is null or p_rating_out_of_10 not between 1 and 10 then
    raise exception 'Rating must be a whole number from 1 to 10.';
  end if;

  return query
  insert into public.book_reviews as saved (
    user_id,
    book_id,
    book_title,
    review_text,
    rating_out_of_10
  )
  values (
    current_user_id,
    btrim(p_book_id),
    btrim(p_book_title),
    btrim(p_review_text),
    p_rating_out_of_10::smallint
  )
  on conflict (user_id, book_id) do update
  set book_title = excluded.book_title,
      review_text = excluded.review_text,
      rating_out_of_10 = excluded.rating_out_of_10,
      updated_at = now()
  returning saved.id,
            saved.book_id,
            saved.book_title,
            saved.review_text,
            saved.rating_out_of_10,
            saved.rating_stars,
            saved.created_at,
            saved.updated_at;
end;
$function$;

revoke all on function public.save_book_review(text, text, text, integer)
  from public, anon;
grant execute on function public.save_book_review(text, text, text, integer)
  to authenticated;