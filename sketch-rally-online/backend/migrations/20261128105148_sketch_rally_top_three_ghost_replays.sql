-- Each racer has one best replay per track, independent of historic leaderboard results.
create table public.sro_simple_replays (
  racer_id uuid not null references public.sro_simple_racers(id),
  mode text not null check (mode in ('auto_drag','auto_challenge')),
  done boolean not null,
  distance numeric not null check (distance >= 0 and distance <= 20000),
  seconds numeric not null check (seconds >= 0.01 and seconds <= 901),
  car text not null check (char_length(car) <= 100),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (racer_id, mode)
);
alter table public.sro_simple_replays enable row level security;
revoke all on table public.sro_simple_replays from public, anon, authenticated;
grant select, insert, update on table public.sro_simple_replays to service_role;

-- Update the real leaderboard and the best available recorded performance atomically.
create function public.sro_simple_submit_replay(p_racer uuid,p_mode text,p_done boolean,p_dist numeric,p_seconds numeric,p_car text,p_payload jsonb)
returns void language sql security invoker set search_path = '' as $$
  select public.sro_simple_submit(p_racer,p_mode,p_done,p_dist,p_seconds,p_car);
  insert into public.sro_simple_replays(racer_id,mode,done,distance,seconds,car,payload)
  values(p_racer,p_mode,p_done,p_dist,p_seconds,p_car,p_payload)
  on conflict(racer_id,mode) do update set
    done=excluded.done,distance=excluded.distance,seconds=excluded.seconds,car=excluded.car,payload=excluded.payload,updated_at=now()
  where (excluded.done and not sro_simple_replays.done)
    or (excluded.done and sro_simple_replays.done and excluded.seconds<sro_simple_replays.seconds)
    or (not excluded.done and not sro_simple_replays.done and
       (excluded.distance>sro_simple_replays.distance or (excluded.distance=sro_simple_replays.distance and excluded.seconds<sro_simple_replays.seconds)));
$$;
revoke all on function public.sro_simple_submit_replay(uuid,text,boolean,numeric,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.sro_simple_submit_replay(uuid,text,boolean,numeric,numeric,text,jsonb) to service_role;

-- Same ordering and membership as the school leaderboard; skip self and racers without a playable replay.
create function public.sro_simple_ghosts(p_room uuid,p_racer uuid,p_mode text)
returns table(name text, car text, done boolean, distance numeric, seconds numeric, replay jsonb)
language sql stable security invoker set search_path = '' as $$
  select r.name,g.car,g.done,g.distance,g.seconds,g.payload
  from public.sro_simple_best b
  join public.sro_simple_racers r on r.id=b.racer_id
  join public.sro_simple_replays g on g.racer_id=b.racer_id and g.mode=b.mode
  where r.room_id=p_room and b.mode=p_mode and b.racer_id<>p_racer
    and p_mode in ('auto_drag','auto_challenge') and (b.done or p_mode='auto_challenge')
    and (g.done or p_mode='auto_challenge')
  order by b.done desc,case when not b.done then b.distance end desc,b.seconds asc,r.id
  limit 3;
$$;
revoke all on function public.sro_simple_ghosts(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sro_simple_ghosts(uuid,uuid,text) to service_role;
