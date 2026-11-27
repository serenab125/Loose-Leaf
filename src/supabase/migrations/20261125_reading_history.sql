create table if not exists public.reading_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    started_at timestamptz not null,
    ended_at timestamptz not null default now(),
    duration_seconds integer not null check (duration_seconds > 0),
    completed boolean not null default false
);

create table if not exists public.reading_journal (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    session_id uuid references public.reading_sessions(id) on delete set null,
    book_title text not null,
    journal_text text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.reading_sessions enable row level security;
alter table public.reading_journal enable row level security;

drop policy if exists "Users manage their own reading sessions"
on public.reading_sessions;

create policy "Users manage their own reading sessions"
on public.reading_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their own journal entries"
on public.reading_journal;

create policy "Users manage their own journal entries"
on public.reading_journal
for all
to authenticated
using (auth.uid() = user_id)
with check (
    auth.uid() = user_id
    and (
        session_id is null
        or exists (
            select 1
            from public.reading_sessions s
            where s.id = session_id
            and s.user_id = auth.uid()
        )
    )
);

create index if not exists reading_sessions_user_idx
on public.reading_sessions (user_id, started_at desc);

create index if not exists reading_journal_user_idx
on public.reading_journal (user_id, created_at desc);
