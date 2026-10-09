-- Family Rewards & Calendar Supabase schema
-- Run in the Supabase SQL editor after creating a project.

create extension if not exists "pgcrypto";

create type app_role as enum ('parent', 'child', 'guardian');
create type reward_status as enum ('available', 'limited', 'archived');
create type notification_kind as enum ('reward_redeemed', 'reward_created', 'points_added', 'event_created', 'event_reminder');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  role app_role not null default 'child',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  owner_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role app_role not null,
  point_balance integer not null default 0 check (point_balance >= 0),
  weekly_points integer not null default 0,
  monthly_points integer not null default 0,
  streak_days integer not null default 0,
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  name text not null,
  description text,
  image_url text,
  point_cost integer not null check (point_cost > 0),
  category text not null default 'Custom',
  quantity_available integer not null default 1 check (quantity_available >= 0),
  expiration_date date,
  status reward_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.users(id) on delete cascade,
  point_cost integer not null check (point_cost > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'fulfilled', 'cancelled')),
  redeemed_at timestamptz not null default now()
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.users(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  activity text not null,
  points_earned integer not null default 0 check (points_earned >= 0),
  points_redeemed integer not null default 0 check (points_redeemed >= 0),
  balance_after integer not null check (balance_after >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint point_transaction_has_value check (points_earned > 0 or points_redeemed > 0)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  icon text,
  milestone_points integer,
  awarded_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  category text not null default 'Family',
  color text not null default '#14b8a6',
  reminder_minutes integer[] not null default array[60],
  recurrence_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ends_after_start check (ends_at > starts_at)
);

create table public.event_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  unique (event_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  kind notification_kind not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_family_members_family_id on public.family_members(family_id);
create index idx_family_members_user_id on public.family_members(user_id);
create index idx_rewards_family_status on public.rewards(family_id, status);
create index idx_rewards_category on public.rewards(family_id, category);
create index idx_reward_redemptions_child on public.reward_redemptions(child_id, redeemed_at desc);
create index idx_point_transactions_child on public.point_transactions(child_id, created_at desc);
create index idx_achievements_child on public.achievements(child_id, awarded_at desc);
create index idx_calendar_events_family_start on public.calendar_events(family_id, starts_at);
create index idx_event_assignments_user on public.event_assignments(user_id);
create index idx_notifications_user_read on public.notifications(user_id, read_at, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at before update on public.users
for each row execute function public.touch_updated_at();

create trigger families_touch_updated_at before update on public.families
for each row execute function public.touch_updated_at();

create trigger rewards_touch_updated_at before update on public.rewards
for each row execute function public.touch_updated_at();

create trigger calendar_events_touch_updated_at before update on public.calendar_events
for each row execute function public.touch_updated_at();

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
  );
$$;

create or replace function public.is_family_adult(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
      and fm.role in ('parent', 'guardian')
  );
$$;

alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.point_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.calendar_events enable row level security;
alter table public.event_assignments enable row level security;
alter table public.notifications enable row level security;

create policy "users can read their own profile"
on public.users for select
using (id = auth.uid());

create policy "users can update their own profile"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "family members can read their families"
on public.families for select
using (public.is_family_member(id));

create policy "parents can update family settings"
on public.families for update
using (public.is_family_adult(id))
with check (public.is_family_adult(id));

create policy "family members can read memberships"
on public.family_members for select
using (public.is_family_member(family_id));

create policy "parents can manage memberships"
on public.family_members for all
using (public.is_family_adult(family_id))
with check (public.is_family_adult(family_id));

create policy "family members can read rewards"
on public.rewards for select
using (public.is_family_member(family_id));

create policy "parents can manage rewards"
on public.rewards for all
using (public.is_family_adult(family_id))
with check (public.is_family_adult(family_id));

create policy "family members can read redemptions"
on public.reward_redemptions for select
using (public.is_family_member(family_id));

create policy "children can create their own redemptions"
on public.reward_redemptions for insert
with check (child_id = auth.uid() and public.is_family_member(family_id));

create policy "parents can manage redemptions"
on public.reward_redemptions for update
using (public.is_family_adult(family_id))
with check (public.is_family_adult(family_id));

create policy "family members can read point history"
on public.point_transactions for select
using (public.is_family_member(family_id));

create policy "parents can create point history"
on public.point_transactions for insert
with check (public.is_family_adult(family_id));

create policy "family members can read achievements"
on public.achievements for select
using (public.is_family_member(family_id));

create policy "parents can manage achievements"
on public.achievements for all
using (public.is_family_adult(family_id))
with check (public.is_family_adult(family_id));

create policy "family members can read events"
on public.calendar_events for select
using (public.is_family_member(family_id));

create policy "family members can create events"
on public.calendar_events for insert
with check (public.is_family_member(family_id));

create policy "parents and creators can edit events"
on public.calendar_events for update
using (created_by = auth.uid() or public.is_family_adult(family_id))
with check (created_by = auth.uid() or public.is_family_adult(family_id));

create policy "parents and creators can delete events"
on public.calendar_events for delete
using (created_by = auth.uid() or public.is_family_adult(family_id));

create policy "family members can read assignments"
on public.event_assignments for select
using (
  exists (
    select 1
    from public.calendar_events ce
    where ce.id = event_id
      and public.is_family_member(ce.family_id)
  )
);

create policy "event creators and parents can manage assignments"
on public.event_assignments for all
using (
  exists (
    select 1
    from public.calendar_events ce
    where ce.id = event_id
      and (ce.created_by = auth.uid() or public.is_family_adult(ce.family_id))
  )
)
with check (
  exists (
    select 1
    from public.calendar_events ce
    where ce.id = event_id
      and (ce.created_by = auth.uid() or public.is_family_adult(ce.family_id))
  )
);

create policy "users can read their notifications"
on public.notifications for select
using (user_id = auth.uid());

create policy "users can mark their notifications read"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "parents can create family notifications"
on public.notifications for insert
with check (public.is_family_adult(family_id));
