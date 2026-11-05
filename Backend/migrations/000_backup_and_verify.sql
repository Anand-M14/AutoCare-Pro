-- =====================================================================
-- AutoCare Pro - STEP 0: create a FRESH backup and prove it matches the live data.
-- Run this BEFORE 001_stage1_security.sql, in Supabase Dashboard > SQL Editor.
--
-- What makes it safe:
--   * It REFUSES to run if schema `backup_stage1` already contains tables, so an old (stale) backup is
--     never silently reused. It never drops or overwrites anything.
--   * It runs as ONE statement: if any check fails, everything it did is rolled back.
--   * It compares row counts AND an md5 fingerprint of every row, live vs backup, and records a manifest.
--   * It only READS public tables. No live data is modified.
--
-- If a previous backup exists, keep it and move it out of the way first (non-destructive):
--     ALTER SCHEMA backup_stage1 RENAME TO backup_stage1_old_20261103;   -- use today's date
-- then run this file again.
--
-- The backup contains the legacy plain-text passwords: treat it as sensitive and drop it when
-- Stage 1 is verified:   DROP SCHEMA backup_stage1 CASCADE;
-- =====================================================================
do $backup$
declare
  tbls text[] := array['users', 'vehicles', 'service_requests'];
  t text;
  l record;
  b record;
begin
  if exists (select 1 from information_schema.tables where table_schema = 'backup_stage1')
     or exists (select 1 from information_schema.routines where routine_schema = 'backup_stage1') then
    raise exception 'Schema backup_stage1 already has objects (possibly a STALE backup). Nothing was changed. '
      'Rename it first: ALTER SCHEMA backup_stage1 RENAME TO backup_stage1_old_<yyyymmdd>;  then run this file again.';
  end if;

  create schema if not exists backup_stage1;
  revoke all on schema backup_stage1 from public;
  revoke all on schema backup_stage1 from anon, authenticated;

  -- Fingerprint = row count + md5 over every row as JSON, ordered by id.
  -- password_hash / password_migrated_at are ignored so the check still works after migration 001.
  create function backup_stage1.table_fingerprint(sch text, tbl text)
    returns table(row_count bigint, checksum text)
    language plpgsql stable as $fn$
  begin
    return query execute format(
      'select count(*)::bigint, md5(coalesce(string_agg(((to_jsonb(x) - %L - %L))::text, %L order by x.id), %L)) from %I.%I x',
      'password_hash', 'password_migrated_at', '|', '', sch, tbl);
  end $fn$;

  create table backup_stage1.backup_manifest (
    table_name text primary key,
    row_count  bigint not null,
    checksum   text   not null,
    taken_at   timestamptz not null default now()
  );

  foreach t in array tbls loop
    execute format('create table backup_stage1.%I as table public.%I', t || '_before_stage1', t);

    select * into l from backup_stage1.table_fingerprint('public', t);
    select * into b from backup_stage1.table_fingerprint('backup_stage1', t || '_before_stage1');

    if l.row_count <> b.row_count or l.checksum <> b.checksum then
      raise exception 'Backup of % does not match the live table (live % rows, backup % rows). Everything was rolled back.',
        t, l.row_count, b.row_count;
    end if;

    insert into backup_stage1.backup_manifest (table_name, row_count, checksum) values (t, l.row_count, l.checksum);
  end loop;

  -- Re-usable verification: compares live vs backup vs manifest at any later time.
  create function backup_stage1.verify_backup()
    returns table(table_name text, live_rows bigint, backup_rows bigint, manifest_rows bigint,
                  live_matches_backup boolean, backup_intact boolean, ok boolean, backup_taken_at timestamptz)
    language plpgsql stable as $fn$
  declare t text; l record; b record; m record;
  begin
    foreach t in array array['users', 'vehicles', 'service_requests'] loop
      select * into l from backup_stage1.table_fingerprint('public', t);
      select * into b from backup_stage1.table_fingerprint('backup_stage1', t || '_before_stage1');
      select * into m from backup_stage1.backup_manifest where backup_manifest.table_name = t;
      table_name := t;
      live_rows := l.row_count; backup_rows := b.row_count; manifest_rows := m.row_count;
      live_matches_backup := (l.row_count = b.row_count and l.checksum = b.checksum);
      backup_intact := (b.row_count = m.row_count and b.checksum = m.checksum);
      ok := live_matches_backup and backup_intact;
      backup_taken_at := m.taken_at;
      return next;
    end loop;
  end $fn$;

  revoke all on function backup_stage1.table_fingerprint(text, text) from public;
  revoke all on function backup_stage1.verify_backup() from public;

  raise notice 'Backup created and verified for: %. Now run:  select * from backup_stage1.verify_backup();', tbls;
end
$backup$;

-- Run this next. Every row must show ok = true (and the row counts must match what you expect):
select * from backup_stage1.verify_backup();
