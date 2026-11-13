-- ================================================================
-- HJS ATTENDANCE — 13 Nov 2026 — PART 3: ROSTER (sales outside work)
-- Run AFTER Part 1 + 2 of 12 Nov and 13 Nov. Safe to run again.
--
--   * Roster is NOT leave. It's a location bypass for sales staff
--     working outside: one date + from–to time.
--   * Only Inside Sales (team name or designation has "Inside Sales") can apply.
--   * No approval — it applies as soon as it's saved.
--   * Bypass only inside the roster time (IST): check-in / check-out
--     between from and to = from anywhere; outside it the normal
--     rule (500 m for Mohali HO / Noida Showroom, off-site flag for
--     others).
--   * Pay / hours are untouched — they still come from check-in /
--     check-out, exactly as before.
--   * punch_in / punch_out are the 12 Nov versions + the roster check
--     (marked "NEW 13 Nov"). Nothing else changed in them.
-- ================================================================


-- ----------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------
create table if not exists public.rosters (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date   date not null,
  from_time   time not null,
  to_time     time not null,
  reason      text,
  status      text not null default 'Active' check (status in ('Active', 'Cancelled')),
  created_by  uuid references public.employees(id),
  created_at  timestamptz not null default now(),
  check (to_time > from_time)
);

create index if not exists idx_rosters_emp_date on public.rosters(employee_id, work_date);
-- ek din ka ek hi active roster
create unique index if not exists uq_rosters_active
  on public.rosters(employee_id, work_date) where status = 'Active';

alter table public.rosters enable row level security;

drop policy if exists "see rosters" on public.rosters;
create policy "see rosters" on public.rosters for select to authenticated
  using (public.can_see(employee_id));
-- likhna sirf neeche ke functions se (security definer)


-- ----------------------------------------------------------------
-- 2. Helpers
-- ----------------------------------------------------------------
-- Roster sirf Inside Sales: team ke naam ya designation mein "Inside Sales"
create or replace function public.is_sales(p_emp uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $function$
  select coalesce((select coalesce(t.name, '') ~* 'inside\s*sales'
                       or coalesce(e.designation, '') ~* 'inside\s*sales'
                     from public.employees e
                     left join public.teams t on t.id = e.team_id
                    where e.id = p_emp), false);
$function$;

grant execute on function public.is_sales(uuid) to authenticated;

-- Abhi (IST) roster ke time ke andar hai?
create or replace function public.has_roster_now(p_emp uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.rosters r
     where r.employee_id = p_emp
       and r.status = 'Active'
       and r.work_date = public.ist_today()
       and (now() at time zone 'Asia/Kolkata')::time between r.from_time and r.to_time);
$function$;

grant execute on function public.has_roster_now(uuid) to authenticated;


-- ----------------------------------------------------------------
-- 3. Apply / cancel
-- ----------------------------------------------------------------
create or replace function public.apply_roster(
  p_date date, p_from time, p_to time, p_reason text default null)
returns public.rosters
language plpgsql security definer
set search_path to 'public'
as $function$
declare
  me uuid := public.my_emp_id();
  r  public.rosters;
begin
  if me is null then raise exception 'Employee record nahi mila'; end if;
  if not public.is_sales(me) then
    raise exception 'Roster sirf Sales team ke liye hai';
  end if;
  if p_date is null or p_from is null or p_to is null then
    raise exception 'Date, from aur to time teeno chahiye';
  end if;
  if p_to <= p_from then
    raise exception 'To time, from time ke baad hona chahiye';
  end if;
  if p_date < public.ist_today() then
    raise exception 'Pichhli date ka roster nahi lag sakta';
  end if;
  if p_date > public.ist_today() + 30 then
    raise exception 'Roster sirf agle 30 din tak ka lag sakta hai';
  end if;
  if p_date = public.ist_today()
     and p_to <= (now() at time zone 'Asia/Kolkata')::time then
    raise exception 'Aaj ka roster ka to-time nikal chuka hai';
  end if;

  -- us din pehle se roster hai to wahi badal do
  update public.rosters
     set from_time = p_from, to_time = p_to,
         reason = nullif(btrim(coalesce(p_reason, '')), ''),
         created_by = me, created_at = now()
   where employee_id = me and work_date = p_date and status = 'Active'
  returning * into r;

  if r.id is null then
    insert into public.rosters (employee_id, work_date, from_time, to_time, reason, created_by)
    values (me, p_date, p_from, p_to, nullif(btrim(coalesce(p_reason, '')), ''), me)
    returning * into r;
  end if;
  return r;
end;
$function$;

grant execute on function public.apply_roster(date, time, time, text) to authenticated;

create or replace function public.cancel_roster(p_id uuid)
returns void
language plpgsql security definer
set search_path to 'public'
as $function$
declare r public.rosters;
begin
  select * into r from public.rosters where id = p_id;
  if r.id is null then raise exception 'Roster nahi mila'; end if;
  if r.employee_id <> public.my_emp_id() and not coalesce(public.can_approve(r.employee_id), false) then
    raise exception 'Ye roster aap cancel nahi kar sakte';
  end if;
  update public.rosters set status = 'Cancelled' where id = p_id;
end;
$function$;

grant execute on function public.cancel_roster(uuid) to authenticated;


-- ----------------------------------------------------------------
-- 4. 500 m check — roster ke time mein bypass
-- ----------------------------------------------------------------
create or replace function public.corp_geo_check(
  p_emp uuid, p_lat double precision, p_lng double precision,
  p_accuracy integer, p_what text)
returns void
language plpgsql stable security definer
set search_path to 'public'
as $function$
declare e public.employees; b public.branches; d double precision;
begin
  select * into e from public.employees where id = p_emp;
  if not public.is_strict_geo(p_emp) or coalesce(e.field_staff, false)
     or public.has_wfh(p_emp, public.ist_today())
     or public.has_roster_now(p_emp) then          -- NEW 13 Nov: roster
    return;
  end if;
  select * into b from public.branches where id = e.branch_id;
  if b.lat is null then return; end if;

  if p_lat is null then
    raise exception 'Location chahiye. Location on karke dobara % kijiye.', p_what;
  end if;
  d := public.distance_m(p_lat, p_lng, b.lat, b.lng);
  if d - least(coalesce(p_accuracy, 0), 100) > 500 then
    raise exception 'Aap office se % m door ho. % sirf office ke 500 m ke andar se hoga (WFH apply kiya ho to kahin se bhi).',
      round(d)::int, initcap(p_what);
  end if;
end;
$function$;


-- ----------------------------------------------------------------
-- 5. punch_in — 12 Nov version + roster in geo_ok
-- ----------------------------------------------------------------
create or replace function public.punch_in(
  p_lat double precision default null,
  p_lng double precision default null,
  p_accuracy integer default null)
returns attendance_logs
language plpgsql security definer
set search_path to 'public'
as $function$
declare
  e public.employees; b public.branches;
  d double precision; geo_ok boolean;
  today date := public.ist_today();
  out_row public.attendance_logs;
  stale record;
  missed date;
  corp boolean;
begin
  e := (select x from public.employees x
         where x.auth_user_id = auth.uid() and x.active limit 1);
  if e.id is null then raise exception 'Employee record nahi mila ya inactive hai'; end if;
  if e.approval_status <> 'Approved' then
    raise exception 'Aapka account abhi approve nahi hua. Admin se poochhiye.';
  end if;

  perform set_config('hjs.system_change', 'on', true);

  for stale in
    select s.id, s.work_date, s.in_at from public.attendance_sessions s
     where s.employee_id = e.id and s.out_at is null and s.work_date < today
  loop
    update public.attendance_sessions
       set out_at = greatest(stale.in_at,
                    (stale.work_date + e.shift_end) at time zone 'Asia/Kolkata'),
           minutes = greatest(0, floor(extract(epoch from
                     (greatest(stale.in_at,
                      (stale.work_date + e.shift_end) at time zone 'Asia/Kolkata')
                      - stale.in_at)) / 60)::int),
           auto_closed = true
     where id = stale.id;
    perform public.recompute_day(e.id, stale.work_date);
  end loop;

  missed := public.missed_checkout_day(e.id);
  if missed is not null then
    raise exception 'Aapne % ko check-out nahi kiya. Pehle us din ka regularization apply kijiye, phir check-in hoga.',
      to_char(missed, 'DD Mon');
  end if;

  if exists (select 1 from public.attendance_sessions
             where employee_id = e.id and work_date = today and out_at is null) then
    raise exception 'Aap already checked in hain. Pehle check out kijiye.';
  end if;

  perform public.corp_geo_check(e.id, p_lat, p_lng, p_accuracy, 'check-in');
  corp := public.is_strict_geo(e.id);

  b := (select x from public.branches x where x.id = e.branch_id);
  d := public.distance_m(p_lat, p_lng, b.lat, b.lng);
  geo_ok := case
              when e.field_staff then true
              when public.has_wfh(e.id, today) then true
              when public.has_roster_now(e.id) then true      -- NEW 13 Nov: roster
              when b.lat is null then true
              when p_lat is null then false
              when corp then d <= 500
              else d <= coalesce(b.radius_m, 250) end;

  insert into public.attendance_sessions (
    employee_id, work_date, in_at, in_lat, in_lng, in_distance_m, in_geo_ok
  ) values (e.id, today, now(), p_lat, p_lng, round(d)::int, geo_ok);

  perform public.recompute_day(e.id, today);
  out_row := (select x from public.attendance_logs x
               where x.employee_id = e.id and x.work_date = today);
  return out_row;
end;
$function$;


-- ----------------------------------------------------------------
-- 6. punch_out — 12 Nov version + roster in geo_ok
-- ----------------------------------------------------------------
create or replace function public.punch_out(
  p_lat double precision default null,
  p_lng double precision default null,
  p_accuracy integer default null)
returns attendance_logs
language plpgsql security definer
set search_path to 'public'
as $function$
declare
  e public.employees; b public.branches; s public.attendance_sessions;
  d double precision; out_row public.attendance_logs; corp boolean;
begin
  select * into e from public.employees where auth_user_id = auth.uid() and active;
  if e.id is null then raise exception 'Employee record nahi mila'; end if;

  select * into s from public.attendance_sessions
   where employee_id = e.id and out_at is null
   order by in_at desc limit 1;
  if s.id is null then raise exception 'Koi chalti hui session nahi hai. Pehle check in kijiye.'; end if;

  perform public.corp_geo_check(e.id, p_lat, p_lng, p_accuracy, 'check-out');
  corp := public.is_strict_geo(e.id);

  select * into b from public.branches where id = e.branch_id;
  d := public.distance_m(p_lat, p_lng, b.lat, b.lng);

  update public.attendance_sessions set
    out_at         = now(),
    out_lat        = p_lat,
    out_lng        = p_lng,
    out_distance_m = round(d)::int,
    out_geo_ok     = case
                       when e.field_staff then true
                       when public.has_wfh(e.id, public.ist_today()) then true
                       when public.has_roster_now(e.id) then true   -- NEW 13 Nov: roster
                       when b.lat is null then true
                       when p_lat is null then false
                       when corp then d <= 500
                       else d <= coalesce(b.radius_m, 250) end,
    minutes        = floor(extract(epoch from (now() - in_at)) / 60)::int
  where id = s.id;

  perform public.recompute_day(e.id, s.work_date);
  select * into out_row from public.attendance_logs
   where employee_id = e.id and work_date = s.work_date;
  return out_row;
end;
$function$;
