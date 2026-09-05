-- Permanent leaderboard records for Sus Games
-- IMPORTANT: player_name/avatar_url are snapshots. They are intentionally
-- stored independently of profiles so old leaderboard entries survive
-- profile edits or profile deletion.

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  game_type text not null check (game_type in ('quiz','puzzle','drawzy')),
  player_name text not null,
  avatar_url text,
  score integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists game_scores_game_score_idx
  on public.game_scores (game_type, score desc, created_at asc);

create index if not exists game_scores_user_idx
  on public.game_scores (user_id);

alter table public.game_scores enable row level security;

-- Everyone can read leaderboard records.
drop policy if exists "Anyone can read game scores" on public.game_scores;
create policy "Anyone can read game scores"
  on public.game_scores for select
  using (true);

-- A signed-in player may submit their own score. The identity is taken
-- from auth.uid(), so a client cannot submit scores for another account.
drop policy if exists "Players can submit own scores" on public.game_scores;
create policy "Players can submit own scores"
  on public.game_scores for insert
  to authenticated
  with check (user_id = auth.uid());

-- Scores are append-only from the client. There is deliberately no UPDATE
-- or DELETE policy, preserving historical leaderboard records.

-- Convenience view for the Main Hub: highest score per player/game.
create or replace view public.game_leaderboard as
select distinct on (game_type, coalesce(user_id, id))
  id,
  user_id,
  game_type,
  player_name,
  avatar_url,
  score,
  created_at
from public.game_scores
order by game_type, coalesce(user_id, id), score desc, created_at asc;
