-- Phase 3: market lifecycle state machine, resolution + payouts, Brier scoring,
-- user profiles, and a pg_cron tick that advances states idempotently.

-- ── Profiles ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  is_anonymous boolean not null default false,
  brier double precision,            -- null until the user has scored markets
  markets_scored integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles are public" on public.profiles for select using (true);
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Backfill any existing users
insert into public.profiles (id, username, is_anonymous)
select id,
  coalesce(nullif(raw_user_meta_data->>'username', ''),
           'anon_' || substr(replace(id::text, '-', ''), 1, 6)),
  is_anonymous
from auth.users
on conflict (id) do nothing;

-- Signup now creates the FP grant AND a profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.fp_ledger (user_id, amount, kind) values (new.id, 1000, 'grant');
  insert into public.profiles (id, username, is_anonymous)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''),
             'anon_' || substr(replace(new.id::text, '-', ''), 1, 6)),
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;

-- ── Lifecycle columns ─────────────────────────────────────────────────────────

alter table public.markets
  add column anchor_ends_at timestamptz not null default (now() + interval '10 minutes'),
  add column resolved_at timestamptz,
  add column voided boolean not null default false;

-- New markets start in the sentiment-anchor window
alter table public.markets alter column status set default 'anchor';

-- Market creation policy now expects anchor status
drop policy "create own market with zero inventory" on public.markets;
create policy "create own market with zero inventory" on public.markets
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and q_yes = 0 and q_no = 0 and traders = 0
    and status = 'anchor' and outcome is null and voided = false
  );

-- Capture the post-trade price so Brier scores can use each trader's
-- last revealed belief once the market resolves.
alter table public.trades add column price_yes_after double precision;

-- Seed markets carried 2025 resolution dates, which the close job would
-- instantly close. Spread them over the coming weeks instead.
update public.markets
set resolution_date = current_date + (3 + (id * 7 % 60))::int
where status = 'trading' and resolution_date <= current_date;

-- ── execute_trade: also record the post-trade yes price ───────────────────────

create or replace function public.execute_trade(
  p_market_id bigint,
  p_side text,
  p_shares double precision
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  m public.markets%rowtype;
  v_new_yes double precision;
  v_new_no double precision;
  v_cost double precision;
  v_balance double precision;
  v_trade_id bigint;
  v_new_position boolean;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_side not in ('yes', 'no') then
    raise exception 'side must be yes or no';
  end if;
  if p_shares is null or p_shares <= 0 or p_shares > 1000 then
    raise exception 'shares must be in (0, 1000]';
  end if;

  select * into m from markets where id = p_market_id for update;
  if not found then
    raise exception 'market % not found', p_market_id;
  end if;
  if m.status <> 'trading' then
    raise exception 'market is % — not open for trading', m.status;
  end if;

  v_new_yes := m.q_yes + case when p_side = 'yes' then p_shares else 0 end;
  v_new_no  := m.q_no  + case when p_side = 'no'  then p_shares else 0 end;
  v_cost := lmsr_cost(v_new_yes, v_new_no, m.b) - lmsr_cost(m.q_yes, m.q_no, m.b);

  select coalesce(sum(amount), 0) into v_balance from fp_ledger where user_id = v_user;
  if v_balance < v_cost then
    raise exception 'insufficient FP: balance %, cost %',
      round(v_balance::numeric, 2), round(v_cost::numeric, 2);
  end if;

  insert into trades (market_id, user_id, side, shares, cost, price_yes_after)
    values (p_market_id, v_user, p_side, p_shares, v_cost,
            lmsr_price(v_new_yes, v_new_no, m.b))
    returning id into v_trade_id;

  insert into fp_ledger (user_id, amount, kind, trade_id)
    values (v_user, -v_cost, 'trade', v_trade_id);

  v_new_position := not exists (
    select 1 from positions where market_id = p_market_id and user_id = v_user
  );
  insert into positions (market_id, user_id, yes_shares, no_shares)
    values (
      p_market_id, v_user,
      case when p_side = 'yes' then p_shares else 0 end,
      case when p_side = 'no'  then p_shares else 0 end
    )
    on conflict (market_id, user_id) do update set
      yes_shares = positions.yes_shares + excluded.yes_shares,
      no_shares  = positions.no_shares  + excluded.no_shares;

  update markets set
    q_yes = v_new_yes,
    q_no = v_new_no,
    traders = traders + case when v_new_position then 1 else 0 end
  where id = p_market_id;

  return jsonb_build_object(
    'trade_id', v_trade_id,
    'cost', v_cost,
    'q_yes', v_new_yes,
    'q_no', v_new_no,
    'traders', m.traders + case when v_new_position then 1 else 0 end,
    'yes_price', lmsr_price(v_new_yes, v_new_no, m.b),
    'balance', v_balance - v_cost
  );
end;
$$;

-- ── Brier scoring ─────────────────────────────────────────────────────────────
-- A user's prediction for a market is the yes-price after their last trade
-- (their final revealed belief). Voided markets never score.

create or replace function public.recompute_user_stats(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update profiles set
    (brier, markets_scored) = (
      select avg(power(pred - m.outcome::int, 2)), count(*)::int
      from markets m
      cross join lateral (
        select t.price_yes_after as pred
        from trades t
        where t.user_id = p_user and t.market_id = m.id
        order by t.id desc limit 1
      ) last_trade
      where m.status = 'resolved' and m.voided = false
        and m.outcome is not null and last_trade.pred is not null
    )
  where id = p_user;
end;
$$;

-- ── Resolution ────────────────────────────────────────────────────────────────
-- Self-resolution by the market creator. Pays 1 FP per winning share and
-- recomputes Brier for every participant, all in one transaction.

create or replace function public.resolve_market(p_market_id bigint, p_outcome boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  m public.markets%rowtype;
  r record;
  v_paid double precision := 0;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into m from markets where id = p_market_id for update;
  if not found then
    raise exception 'market % not found', p_market_id;
  end if;
  if m.creator_id is distinct from v_user then
    raise exception 'only the market creator can resolve it';
  end if;
  if m.status not in ('trading', 'closed') then
    raise exception 'market is % — cannot resolve', m.status;
  end if;

  update markets
    set status = 'resolved', outcome = p_outcome, resolved_at = now()
    where id = p_market_id;

  -- Payouts: winning shares redeem at 1 FP each
  for r in
    select user_id,
           case when p_outcome then yes_shares else no_shares end as payout
    from positions where market_id = p_market_id
  loop
    if r.payout > 0 then
      insert into fp_ledger (user_id, amount, kind) values (r.user_id, r.payout, 'payout');
      v_paid := v_paid + r.payout;
    end if;
  end loop;

  -- Brier update for everyone who traded this market
  for r in select distinct user_id from trades where market_id = p_market_id loop
    perform recompute_user_stats(r.user_id);
  end loop;

  return jsonb_build_object('market_id', p_market_id, 'outcome', p_outcome, 'paid_out', v_paid);
end;
$$;

-- ── Voiding ───────────────────────────────────────────────────────────────────
-- Markets nobody resolves can't hold traders' FP hostage forever: 14 days after
-- close they void and every trader is refunded their full cost. Voided markets
-- never touch Brier scores.

create or replace function public.void_market(p_market_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m public.markets%rowtype;
begin
  select * into m from markets where id = p_market_id for update;
  if not found or m.status = 'resolved' then
    return; -- idempotent: already handled
  end if;

  update markets
    set status = 'resolved', voided = true, outcome = null, resolved_at = now()
    where id = p_market_id;

  insert into fp_ledger (user_id, amount, kind)
  select user_id, sum(cost), 'payout'
  from trades where market_id = p_market_id
  group by user_id
  having sum(cost) > 0;
end;
$$;

-- ── State machine tick ────────────────────────────────────────────────────────
-- Runs every minute via pg_cron. Every transition is a guarded UPDATE, so the
-- tick is idempotent: running it twice (or after downtime) converges to the
-- same state.

create or replace function public.advance_market_states()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  -- anchor window over -> open for trading
  update markets set status = 'trading'
  where status = 'anchor' and now() >= anchor_ends_at;

  -- past resolution date -> soft close (awaiting creator resolution)
  update markets set status = 'closed'
  where status = 'trading' and current_date > resolution_date;

  -- unresolved 14 days after close -> void and refund
  for r in
    select id from markets
    where status = 'closed' and current_date > resolution_date + 14
  loop
    perform void_market(r.id);
  end loop;
end;
$$;

create extension if not exists pg_cron;
select cron.schedule('castlot-lifecycle-tick', '* * * * *', 'select public.advance_market_states()');
