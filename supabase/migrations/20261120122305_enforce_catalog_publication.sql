-- Explicit Data API grants for installs without automatic public-schema grants.
grant select on public.locations, public.location_photos, public.location_sources,
  public.location_categories, public.location_moods to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (status) on public.locations to authenticated;
grant select on public.locations, public.location_photos, public.location_sources,
  public.location_categories, public.location_moods to service_role;
grant insert, select on public.location_submissions, public.content_reports to service_role;
grant select on public.location_submissions, public.content_reports to authenticated;
grant update (status, reviewed_by, reviewed_at) on public.location_submissions to authenticated;
grant update (status, resolved_by, resolved_at) on public.content_reports to authenticated;

-- Route public writes through the validated and rate-limited Pages Functions.
drop policy if exists "submissions anon insert" on public.location_submissions;
drop policy if exists "reports anon insert" on public.content_reports;
revoke insert on public.location_submissions, public.content_reports from anon, authenticated;

create or replace function public.assert_publishable(p_location_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_verified integer;
  v_unique_checksums integer;
  v_unique_urls integer;
begin
  select count(*),
         count(*) filter (where is_verified and nullif(btrim(checksum), '') is not null),
         count(distinct checksum),
         count(distinct original_url)
    into v_total, v_verified, v_unique_checksums, v_unique_urls
    from public.location_photos
    where location_id = p_location_id;

  if v_total < 5 or v_total <> v_verified or v_total <> v_unique_checksums or v_total <> v_unique_urls then
    raise exception 'publish gate: location % needs at least five distinct verified photos', p_location_id
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1 from public.location_sources
    where location_id = p_location_id and source_url like 'https://%'
  ) then
    raise exception 'publish gate: location % has no HTTPS evidence source', p_location_id
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.photos_guard_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_id text := coalesce(new.location_id, old.location_id);
begin
  if tg_op = 'UPDATE' and new.location_id <> old.location_id then
    raise exception 'photo location cannot be changed' using errcode = 'check_violation';
  end if;
  -- The parent update serializes edits and invokes locations_before_write.
  update public.locations set updated_at = now() where id = v_location_id;
  if tg_op in ('INSERT', 'UPDATE') and new.is_cover then
    update public.location_photos set is_cover = false
      where location_id = new.location_id and id <> new.id and is_cover;
  end if;
  return null;
end;
$$;

create function public.sources_guard_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location_id text := coalesce(new.location_id, old.location_id);
begin
  if tg_op = 'UPDATE' and new.location_id <> old.location_id then
    raise exception 'evidence location cannot be changed' using errcode = 'check_violation';
  end if;
  update public.locations set updated_at = now() where id = v_location_id;
  return null;
end;
$$;

create trigger sources_guard_published
  after insert or update or delete on public.location_sources
  for each row execute function public.sources_guard_published();

create function public.audit_location_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_audit_log (actor_id, action, entity, entity_id, before, after)
    values (auth.uid(), 'location_status_changed', 'locations', new.id,
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  return null;
end;
$$;

create trigger audit_location_status
  after update of status on public.locations
  for each row when (old.status is distinct from new.status)
  execute function public.audit_location_status();

revoke execute on function public.assert_publishable(text), public.verified_photo_count(text),
  public.photos_guard_published(), public.sources_guard_published(), public.audit_location_status()
  from public, anon, authenticated;

-- Existing rows that predate the stricter gate need editorial review again.
do $$
declare
  v_id text;
begin
  for v_id in select id from public.locations where status = 'published' loop
    begin
      perform public.assert_publishable(v_id);
    exception when check_violation then
      update public.locations set status = 'draft' where id = v_id;
    end;
  end loop;
end;
$$;
