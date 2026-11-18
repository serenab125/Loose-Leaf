-- Add the review form fields.
alter table public.book_reviews
  add column if not exists review_type text,
  add column if not exists includes_spoilers boolean;

-- Give existing rows safe values and enforce valid values going forward.
alter table public.book_reviews
  drop constraint if exists book_reviews_review_type_check;

update public.book_reviews
set review_type = 'Casual'
where review_type is null
   or review_type not in ('Casual', 'Analytical');

update public.book_reviews
set includes_spoilers = false
where includes_spoilers is null;

alter table public.book_reviews
  alter column review_type set default 'Casual',
  alter column review_type set not null,
  alter column includes_spoilers set default false,
  alter column includes_spoilers set not null,
  add constraint book_reviews_review_type_check
    check (review_type in ('Casual', 'Analytical'));

-- Keep one review per user per book.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.book_reviews'::regclass
      and conname = 'book_reviews_one_per_user_book'
      and contype = 'u'
  ) then
    alter table public.book_reviews
      add constraint book_reviews_one_per_user_book
      unique (user_id, book_id);
  end if;
end;
$$;

-- Permit the authenticated role to access rows only through the policies below.
alter table public.book_reviews enable row level security;

revoke all on table public.book_reviews
  from public, anon, authenticated;
grant select, insert, update on table public.book_reviews
  to authenticated;

drop policy if exists "Users can read their own reviews"
  on public.book_reviews;
create policy "Users can read their own reviews"
  on public.book_reviews
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reviews"
  on public.book_reviews;
create policy "Users can insert their own reviews"
  on public.book_reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reviews"
  on public.book_reviews;
create policy "Users can update their own reviews"
  on public.book_reviews
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Replace the old four-argument RPC with the version that accepts the new fields.
drop function if exists public.save_book_review(text, text, text, integer);

drop function if exists public.save_book_review(
  text, text, text, integer, text, boolean
);

create or replace function public.save_book_review(
  p_book_id text,
  p_book_title text,
  p_review_text text,
  p_rating_out_of_10 integer,
  p_review_type text,
  p_includes_spoilers boolean
)
returns table (
  id uuid,
  book_id text,
  book_title text,
  review_text text,
  rating_out_of_10 smallint,
  rating_stars numeric,
  review_type text,
  includes_spoilers boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
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

  if p_review_text is null
     or length(btrim(p_review_text)) not between 1 and 5000 then
    raise exception 'Review text must contain between 1 and 5000 characters.';
  end if;

  if p_rating_out_of_10 is null
     or p_rating_out_of_10 not between 1 and 10 then
    raise exception 'Rating must be a whole number from 1 to 10.';
  end if;

  if p_review_type is null
     or p_review_type not in ('Casual', 'Analytical') then
    raise exception 'Review type must be Casual or Analytical.';
  end if;

  if p_includes_spoilers is null then
    raise exception 'Specify whether the review includes spoilers.';
  end if;

  return query
  insert into public.book_reviews as saved (
    user_id,
    book_id,
    book_title,
    review_text,
    rating_out_of_10,
    review_type,
    includes_spoilers
  )
  values (
    current_user_id,
    btrim(p_book_id),
    btrim(p_book_title),
    btrim(p_review_text),
    p_rating_out_of_10::smallint,
    p_review_type,
    p_includes_spoilers
  )
  on conflict (user_id, book_id) do update
  set book_title = excluded.book_title,
      review_text = excluded.review_text,
      rating_out_of_10 = excluded.rating_out_of_10,
      review_type = excluded.review_type,
      includes_spoilers = excluded.includes_spoilers,
      updated_at = now()
  returning saved.id,
            saved.book_id,
            saved.book_title,
            saved.review_text,
            saved.rating_out_of_10,
            saved.rating_stars,
            saved.review_type,
            saved.includes_spoilers,
            saved.created_at,
            saved.updated_at;
end;
$function$;

revoke all on function public.save_book_review(
  text, text, text, integer, text, boolean
) from public, anon;

grant execute on function public.save_book_review(
  text, text, text, integer, text, boolean
) to authenticated;