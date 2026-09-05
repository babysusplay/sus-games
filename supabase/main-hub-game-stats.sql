-- Main Hub: public game stats + per-game history support.
-- Run once in the Supabase SQL Editor.
-- Safe to run more than once.

alter table public.game_scores
  add column if not exists game_id text;

create index if not exists game_scores_game_id_idx
  on public.game_scores (game_type, game_id, score desc);

create or replace function public.get_profile_game_stats(target_user uuid)
returns table (
  game_type text,
  games_played bigint,
  total_score bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    gs.game_type,
    count(*)::bigint,
    coalesce(sum(gs.score), 0)::bigint
  from public.game_scores gs
  where gs.user_id = target_user
  group by gs.game_type
  order by gs.game_type;
$$;

create or replace function public.get_game_history(
  requested_game text,
  requested_game_id text,
  result_limit integer default 100
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  score bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.id,
    coalesce(p.display_name, 'Player'),
    p.avatar_url,
    gs.score,
    gs.created_at
  from public.game_scores gs
  join public.profiles p on p.id = gs.user_id
  where gs.game_type = requested_game
    and gs.game_id = requested_game_id
  order by gs.score desc, gs.created_at asc
  limit greatest(1, least(coalesce(result_limit, 100), 100));
$$;

revoke all on function public.get_profile_game_stats(uuid) from public;
revoke all on function public.get_game_history(text, text, integer) from public;
grant execute on function public.get_profile_game_stats(uuid) to authenticated;
grant execute on function public.get_game_history(text, text, integer) to authenticated;
