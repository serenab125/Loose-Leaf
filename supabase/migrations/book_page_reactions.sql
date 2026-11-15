create table if not exists public.book_page_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null check (length(btrim(book_id)) between 1 and 100),
  book_title text not null check (length(btrim(book_title)) between 1 and 500),
  page_number integer not null check (page_number >= 1),
  reaction text not null,
  created_at timestamptz not null default now(),
  constraint book_page_reactions_valid_reaction
    check (length(btrim(reaction)) between 1 and 5000)
);

alter table public.book_page_reactions enable row level security;

alter table public.book_page_reactions
  drop constraint if exists book_page_reactions_unique_per_user;

alter table public.book_page_reactions
  drop constraint if exists book_page_reactions_reaction_check;

alter table public.book_page_reactions
  drop constraint if exists book_page_reactions_valid_reaction;

alter table public.book_page_reactions
  add constraint book_page_reactions_valid_reaction
  check (length(btrim(reaction)) between 1 and 5000);

revoke all on table public.book_page_reactions
  from public, anon, authenticated;

create or replace function public.add_book_page_reaction(
  p_book_id text,
  p_book_title text,
  p_page_number integer,
  p_reaction text
)
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
    raise exception 'Sign in before adding a reaction.';
  end if;

  if p_book_id is null or length(btrim(p_book_id)) not between 1 and 100 then
    raise exception 'A valid book ID is required.';
  end if;

  if p_book_title is null or length(btrim(p_book_title)) not between 1 and 500 then
    raise exception 'A valid book title is required.';
  end if;

  if p_page_number is null or p_page_number < 1 then
    raise exception 'Page number must be a positive whole number.';
  end if;

  if p_reaction is null or length(btrim(p_reaction)) not between 1 and 5000 then
    raise exception 'Reaction text must contain between 1 and 5000 characters.';
  end if;

  return query
  insert into public.book_page_reactions as saved (
    user_id,
    book_id,
    book_title,
    page_number,
    reaction
  )
  values (
    current_user_id,
    btrim(p_book_id),
    btrim(p_book_title),
    p_page_number,
    btrim(p_reaction)
  )
  returning saved.id,
            saved.book_id,
            saved.book_title,
            saved.page_number,
            saved.reaction,
            saved.created_at;
end;
$function$;

revoke all on function public.add_book_page_reaction(text, text, integer, text)
  from public, anon;

grant execute on function public.add_book_page_reaction(text, text, integer, text)
  to authenticated;