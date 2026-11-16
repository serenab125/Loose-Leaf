-- Read access for the community review & chapter-reaction features.
-- Direct table access stays revoked; authenticated clients read through
-- these security-definer RPCs so the app can render reviews/reactions.

create or replace function public.get_book_reviews(p_book_id text)
returns table (
  id uuid,
  user_id uuid,
  book_id text,
  book_title text,
  review_text text,
  rating_out_of_10 smallint,
  rating_stars numeric,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_book_id is null or length(btrim(p_book_id)) = 0 then
    return;
  end if;

  return query
  select
    r.id,
    r.user_id,
    r.book_id,
    r.book_title,
    r.review_text,
    r.rating_out_of_10,
    r.rating_stars,
    r.created_at
  from public.book_reviews r
  where r.book_id = btrim(p_book_id)
  order by r.created_at desc;
end;
$function$;

revoke all on function public.get_book_reviews(text)
  from public, anon;
grant execute on function public.get_book_reviews(text)
  to authenticated;

create or replace function public.get_book_page_reactions(p_book_id text)
returns table (
  id uuid,
  user_id uuid,
  book_id text,
  book_title text,
  page_number integer,
  reaction text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_book_id is null or length(btrim(p_book_id)) = 0 then
    return;
  end if;

  return query
  select
    r.id,
    r.user_id,
    r.book_id,
    r.book_title,
    r.page_number,
    r.reaction,
    r.created_at
  from public.book_page_reactions r
  where r.book_id = btrim(p_book_id)
  order by r.page_number desc, r.created_at desc;
end;
$function$;

revoke all on function public.get_book_page_reactions(text)
  from public, anon;
grant execute on function public.get_book_page_reactions(text)
  to authenticated;

create or replace function public.get_my_book_page_reactions()
returns table (
  id uuid,
  book_id text,
  book_title text,
  page_number integer,
  reaction text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return;
  end if;

  return query
  select
    r.id,
    r.book_id,
    r.book_title,
    r.page_number,
    r.reaction,
    r.created_at
  from public.book_page_reactions r
  where r.user_id = current_user_id
  order by r.created_at desc;
end;
$function$;

revoke all on function public.get_my_book_page_reactions()
  from public, anon;
grant execute on function public.get_my_book_page_reactions()
  to authenticated;
