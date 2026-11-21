-- ============================================================================
-- FRAMEHUNT THAILAND — initial schema
-- Postgres 15+ / Supabase. Apply with `supabase db push` or the SQL editor.
--
-- Design rules enforced in the database (not only the app):
--   1. A location may only be `published` when it has >= 5 verified photos,
--      finite coordinates inside Thailand, and at least one source.
--   2. Public visitors can read published rows only (RLS).
--   3. Only profiles with role = 'admin' may write editorial data.
--   4. Permission / drone / cost fields default to "unknown" — never "yes".
-- ============================================================================

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type location_status as enum ('published', 'draft', 'archived', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type permission_status as enum ('allowed', 'needs_permission', 'unknown', 'restricted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tri_state as enum ('yes', 'no', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_type as enum ('new-location', 'correction', 'permission-doc');
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('pending', 'reviewing', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_status as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('admin', 'editor', 'member');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------
create table if not exists public.provinces (
  slug        text primary key,
  name_th     text not null,
  name_en     text not null,
  region      text not null,
  zone        text not null check (zone in ('A', 'B', 'C'))
);

create table if not exists public.categories (
  slug     text primary key,
  name_th  text not null,
  name_en  text not null,
  "group"  text not null check ("group" in ('urban', 'art', 'nature', 'historical')),
  icon     text not null
);

create table if not exists public.moods (
  slug     text primary key,
  name_th  text not null,
  name_en  text not null
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  display_name text,
  role        user_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------
create table if not exists public.locations (
  id                        text primary key,
  slug                      text not null unique,
  name_th                   text not null,
  name_en                   text not null,
  description_th            text not null default '',
  description_en            text not null default '',
  description_source        jsonb not null default '{"type":"derived","note":"ยังไม่มีข้อมูลยืนยัน"}'::jsonb,

  province_id               text references public.provinces (slug),
  province                  text not null,
  province_th               text not null,
  region                    text not null,
  zone                      text not null check (zone in ('A', 'B', 'C')),
  district                  text,
  address                   text,

  latitude                  double precision not null,
  longitude                 double precision not null,
  geog                      geography(Point, 4326)
                              generated always as (
                                st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
                              ) stored,
  coordinate_source         jsonb not null default '{}'::jsonb,

  location_type             text not null default 'unknown',
  architectural_style       text not null default 'unknown',
  access_status             permission_status not null default 'unknown',
  filming_permission_status permission_status not null default 'unknown',
  estimated_cost            text,
  contact_info              text,
  website_url               text,
  maps_url                  text not null default '',

  verified_at               timestamptz,
  published_at              timestamptz,
  status                    location_status not null default 'draft',

  -- Editorial / production metadata, kept as jsonb so the ingest pipeline can
  -- evolve without a migration per field. Shape mirrors FilmingInfo/CreativeInfo.
  permission                jsonb not null default '{"permission_status":"unknown","contact_details":null,"permission_source":null,"restrictions":null,"verified_at":null,"note":"ยังไม่มีข้อมูลยืนยัน"}'::jsonb,
  filming                   jsonb not null default '{"drone_allowed":"unknown","artificial_light_allowed":"unknown","large_equipment_allowed":"unknown","drone_note":"ต้องตรวจสอบก่อนถ่ายทำ","sound_restrictions":"unknown","dressing_room":"unknown","parking":"unknown","crew_size":"unknown"}'::jsonb,
  creative                  jsonb not null default '{}'::jsonb,
  tags                      text[] not null default '{}',
  qid                       text,
  commons_category          text,
  needs_admin_review        boolean not null default true,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint locations_coords_thailand check (
    latitude between 5 and 21 and longitude between 97 and 106
  ),
  constraint locations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists locations_geog_idx on public.locations using gist (geog);
create index if not exists locations_status_idx on public.locations (status);
create index if not exists locations_province_idx on public.locations (province_id);
create index if not exists locations_name_trgm_idx
  on public.locations using gin ((name_th || ' ' || name_en || ' ' || province_th) gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Photos / sources / taxonomy joins
-- ---------------------------------------------------------------------------
create table if not exists public.location_photos (
  id                  text primary key,
  location_id         text not null references public.locations (id) on delete cascade,
  title               text not null,
  image_url           text not null,
  thumb_url           text not null,
  original_url        text not null,
  source_name         text not null,
  source_page_url     text not null,
  photographer        text not null,
  credit              text,
  license             text not null,
  license_url         text,
  attribution_text    text not null,
  checksum            text,
  perceptual_hash     text,
  width               integer not null check (width > 0),
  height              integer not null check (height > 0),
  is_cover            boolean not null default false,
  is_verified         boolean not null default false,
  verification_status text not null default 'automated',
  subject_evidence    text not null default '',
  verification_checks text[] not null default '{}',
  retrieved_at        timestamptz not null default now(),
  created_at          timestamptz not null default now(),

  constraint photos_https_only check (
    image_url like 'https://%' and thumb_url like 'https://%' and source_page_url like 'https://%'
  ),
  constraint photos_attribution_nonempty check (
    length(btrim(photographer)) > 0 and length(btrim(license)) > 0 and length(btrim(attribution_text)) > 0
  )
);

create index if not exists location_photos_location_idx on public.location_photos (location_id);
create index if not exists location_photos_verified_idx on public.location_photos (location_id) where is_verified;
create unique index if not exists location_photos_checksum_idx
  on public.location_photos (location_id, checksum) where checksum is not null;
create unique index if not exists location_photos_phash_idx
  on public.location_photos (location_id, perceptual_hash) where perceptual_hash is not null;

create table if not exists public.location_sources (
  id           bigserial primary key,
  location_id  text not null references public.locations (id) on delete cascade,
  source_url   text not null,
  source_type  text not null,
  field_verified text not null,
  checked_at   timestamptz not null default now()
);

create index if not exists location_sources_location_idx on public.location_sources (location_id);

create table if not exists public.location_categories (
  location_id text not null references public.locations (id) on delete cascade,
  category_slug text not null references public.categories (slug) on delete cascade,
  primary key (location_id, category_slug)
);

create table if not exists public.location_moods (
  location_id text not null references public.locations (id) on delete cascade,
  mood_slug   text not null references public.moods (slug) on delete cascade,
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  primary key (location_id, mood_slug)
);

-- ---------------------------------------------------------------------------
-- Publish gate
-- ---------------------------------------------------------------------------
create or replace function public.verified_photo_count(p_location_id text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.location_photos
  where location_id = p_location_id and is_verified;
$$;

create or replace function public.assert_publishable(p_location_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_sources integer;
begin
  v_count := public.verified_photo_count(p_location_id);
  if v_count < 5 then
    raise exception 'publish gate: location % has only % verified photos (minimum 5)', p_location_id, v_count
      using errcode = 'check_violation';
  end if;

  select count(*) into v_sources from public.location_sources where location_id = p_location_id;
  if v_sources < 1 then
    raise exception 'publish gate: location % has no source rows', p_location_id
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.locations_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    -- On insert there are no photos yet, so publishing must happen after the
    -- photo rows land. The photo trigger below re-validates on every change.
    if tg_op = 'UPDATE' then
      perform public.assert_publishable(new.id);
      new.published_at := coalesce(new.published_at, now());
    else
      raise exception 'publish gate: insert location as draft, add >= 5 verified photos, then publish'
        using errcode = 'check_violation';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists locations_before_write on public.locations;
create trigger locations_before_write
  before insert or update on public.locations
  for each row execute function public.locations_before_write();

create or replace function public.photos_guard_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id text;
  v_status location_status;
begin
  v_location_id := coalesce(new.location_id, old.location_id);
  select status into v_status from public.locations where id = v_location_id;

  if v_status = 'published' and public.verified_photo_count(v_location_id) < 5 then
    raise exception 'publish gate: cannot drop below 5 verified photos while location % is published', v_location_id
      using errcode = 'check_violation';
  end if;

  -- Only one cover photo per location.
  if (tg_op in ('INSERT', 'UPDATE')) and new.is_cover then
    update public.location_photos
      set is_cover = false
      where location_id = new.location_id and id <> new.id and is_cover;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists photos_guard_published on public.location_photos;
create trigger photos_guard_published
  after insert or update or delete on public.location_photos
  for each row execute function public.photos_guard_published();

-- ---------------------------------------------------------------------------
-- Boards (MV shot lists)
-- ---------------------------------------------------------------------------
create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 160),
  description text not null default '',
  share_slug  text unique default encode(gen_random_bytes(8), 'hex'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists boards_owner_idx on public.boards (owner_id);

create table if not exists public.board_items (
  board_id    uuid not null references public.boards (id) on delete cascade,
  location_id text not null references public.locations (id) on delete cascade,
  notes       text not null default '',
  priority    smallint not null default 2 check (priority between 1 and 3),
  added_at    timestamptz not null default now(),
  primary key (board_id, location_id)
);

-- ---------------------------------------------------------------------------
-- Community submissions & reports
-- ---------------------------------------------------------------------------
create table if not exists public.location_submissions (
  id               uuid primary key default gen_random_uuid(),
  type             submission_type not null default 'new-location',
  name             text not null check (length(btrim(name)) between 2 and 200),
  province         text not null,
  description      text not null check (length(description) >= 30),
  coordinates      text,
  source_url       text check (source_url is null or source_url ~ '^https?://'),
  contact          text,
  photo_note       text,
  permission_note  text,
  submitter_email  text,
  status           submission_status not null default 'pending',
  reviewed_by      uuid references auth.users (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists submissions_status_idx on public.location_submissions (status, created_at desc);

create table if not exists public.content_reports (
  id            uuid primary key default gen_random_uuid(),
  location_slug text not null,
  reason        text not null,
  detail        text not null default '',
  reporter_email text,
  status        report_status not null default 'open',
  resolved_by   uuid references auth.users (id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists reports_status_idx on public.content_reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit log (every admin write)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          bigserial primary key,
  actor_id    uuid references auth.users (id),
  action      text not null,
  entity      text not null,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_entity_idx on public.admin_audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.provinces            enable row level security;
alter table public.categories           enable row level security;
alter table public.moods                enable row level security;
alter table public.locations            enable row level security;
alter table public.location_photos      enable row level security;
alter table public.location_sources     enable row level security;
alter table public.location_categories  enable row level security;
alter table public.location_moods       enable row level security;
alter table public.profiles             enable row level security;
alter table public.boards               enable row level security;
alter table public.board_items          enable row level security;
alter table public.location_submissions enable row level security;
alter table public.content_reports      enable row level security;
alter table public.admin_audit_log      enable row level security;

-- Reference data: readable by everyone, writable by admins.
drop policy if exists "reference read" on public.provinces;
create policy "reference read" on public.provinces for select using (true);
drop policy if exists "reference admin write" on public.provinces;
create policy "reference admin write" on public.provinces for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories read" on public.categories;
create policy "categories read" on public.categories for select using (true);
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "moods read" on public.moods;
create policy "moods read" on public.moods for select using (true);
drop policy if exists "moods admin write" on public.moods;
create policy "moods admin write" on public.moods for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Locations: public reads published only; admins read/write everything.
drop policy if exists "locations public read" on public.locations;
create policy "locations public read" on public.locations for select
  using (status = 'published');

drop policy if exists "locations admin all" on public.locations;
create policy "locations admin all" on public.locations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Photos follow their parent location's visibility.
drop policy if exists "photos public read" on public.location_photos;
create policy "photos public read" on public.location_photos for select
  using (
    is_verified
    and exists (
      select 1 from public.locations l
      where l.id = location_id and l.status = 'published'
    )
  );

drop policy if exists "photos admin all" on public.location_photos;
create policy "photos admin all" on public.location_photos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sources public read" on public.location_sources;
create policy "sources public read" on public.location_sources for select
  using (exists (select 1 from public.locations l where l.id = location_id and l.status = 'published'));
drop policy if exists "sources admin all" on public.location_sources;
create policy "sources admin all" on public.location_sources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "location categories public read" on public.location_categories;
create policy "location categories public read" on public.location_categories for select
  using (exists (select 1 from public.locations l where l.id = location_id and l.status = 'published'));
drop policy if exists "location categories admin all" on public.location_categories;
create policy "location categories admin all" on public.location_categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "location moods public read" on public.location_moods;
create policy "location moods public read" on public.location_moods for select
  using (exists (select 1 from public.locations l where l.id = location_id and l.status = 'published'));
drop policy if exists "location moods admin all" on public.location_moods;
create policy "location moods admin all" on public.location_moods for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles: self read, self update (display name only), admin all.
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Boards: private to owner; public share is served through a security-definer RPC.
drop policy if exists "boards owner all" on public.boards;
create policy "boards owner all" on public.boards for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "board items owner all" on public.board_items;
create policy "board items owner all" on public.board_items for all to authenticated
  using (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()));

-- Submissions: anyone may insert; only admins may read/update/delete.
drop policy if exists "submissions anon insert" on public.location_submissions;
create policy "submissions anon insert" on public.location_submissions for insert
  to anon, authenticated with check (true);

drop policy if exists "submissions admin read" on public.location_submissions;
create policy "submissions admin read" on public.location_submissions for select to authenticated
  using (public.is_admin());

drop policy if exists "submissions admin update" on public.location_submissions;
create policy "submissions admin update" on public.location_submissions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "submissions admin delete" on public.location_submissions;
create policy "submissions admin delete" on public.location_submissions for delete to authenticated
  using (public.is_admin());

-- Reports: anyone may file; admins manage.
drop policy if exists "reports anon insert" on public.content_reports;
create policy "reports anon insert" on public.content_reports for insert
  to anon, authenticated with check (true);

drop policy if exists "reports admin all" on public.content_reports;
create policy "reports admin all" on public.content_reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Audit log: admins read, nobody writes directly (functions only).
drop policy if exists "audit admin read" on public.admin_audit_log;
create policy "audit admin read" on public.admin_audit_log for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helper RPCs used by the app / Pages Functions
-- ---------------------------------------------------------------------------
create or replace function public.nearby_locations(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 25,
  p_limit integer default 24
)
returns table (
  id text,
  slug text,
  name_th text,
  name_en text,
  province_th text,
  latitude double precision,
  longitude double precision,
  distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id, l.slug, l.name_th, l.name_en, l.province_th, l.latitude, l.longitude,
    round((st_distance(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000)::numeric, 2)::double precision
  from public.locations l
  where l.status = 'published'
    and st_dwithin(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
  order by l.geog <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit greatest(1, least(p_limit, 100));
$$;

create or replace function public.search_locations(
  p_query text default '',
  p_province text default null,
  p_limit integer default 40,
  p_offset integer default 0
)
returns table (
  id text,
  slug text,
  name_th text,
  name_en text,
  province_th text,
  photo_count integer,
  similarity real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id, l.slug, l.name_th, l.name_en, l.province_th,
    public.verified_photo_count(l.id) as photo_count,
    greatest(
      similarity(l.name_th, coalesce(p_query, '')),
      similarity(l.name_en, coalesce(p_query, ''))
    ) as similarity
  from public.locations l
  where l.status = 'published'
    and (p_province is null or l.province_id = p_province)
    and (
      coalesce(btrim(p_query), '') = ''
      or (l.name_th || ' ' || l.name_en || ' ' || l.province_th) ilike '%' || p_query || '%'
      or similarity(l.name_th, p_query) > 0.2
      or similarity(l.name_en, p_query) > 0.2
    )
  order by
    case when coalesce(btrim(p_query), '') = '' then 0 else -similarity(l.name_th, p_query) end,
    l.published_at desc nulls last
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;

-- Public share of a board: returns the board and its items without exposing
-- other boards or requiring the viewer to be the owner.
create or replace function public.get_shared_board(p_share_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'description', b.description,
    'createdAt', b.created_at,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'locationId', bi.location_id,
            'notes', bi.notes,
            'priority', bi.priority,
            'addedAt', bi.added_at
          )
          order by bi.priority, bi.added_at
        )
        from public.board_items bi
        join public.locations l on l.id = bi.location_id and l.status = 'published'
        where bi.board_id = b.id
      ),
      '[]'::jsonb
    )
  )
  from public.boards b
  where b.share_slug = p_share_slug;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.nearby_locations(double precision, double precision, double precision, integer) to anon, authenticated;
grant execute on function public.search_locations(text, text, integer, integer) to anon, authenticated;
grant execute on function public.get_shared_board(text) to anon, authenticated;
revoke all on function public.assert_publishable(text) from anon, authenticated;
revoke all on function public.verified_photo_count(text) from anon;
grant execute on function public.verified_photo_count(text) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at helpers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists boards_touch_updated_at on public.boards;
create trigger boards_touch_updated_at
  before update on public.boards
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile row whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
