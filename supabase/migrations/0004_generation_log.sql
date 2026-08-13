-- Phase 4: log every market-generation attempt so rejection rate is a real,
-- queryable metric (underspecified narrations get rejected, not laundered
-- into unresolvable markets).

create table public.market_generation_log (
  id bigint generated always as identity primary key,
  accepted boolean not null,
  rejection_reasons jsonb not null default '[]'::jsonb,
  transcript_chars integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.market_generation_log enable row level security;

-- The API endpoint writes with the anon key; nothing is user-identifiable.
create policy "log inserts from api" on public.market_generation_log
  for insert with check (true);
create policy "log is readable" on public.market_generation_log
  for select using (true);

-- The metric: select * from public.generation_stats;
create view public.generation_stats as
select
  count(*) as attempts,
  count(*) filter (where accepted) as accepted,
  count(*) filter (where not accepted) as rejected,
  round(100.0 * count(*) filter (where not accepted) / greatest(count(*), 1), 1)
    as rejection_rate_pct
from public.market_generation_log;
