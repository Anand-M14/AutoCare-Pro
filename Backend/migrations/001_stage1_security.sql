-- =====================================================================
-- AutoCare Pro - Stage 1 migration (SAFE / ADDITIVE ONLY)
-- Run in: Supabase Dashboard > SQL Editor, AFTER 000_backup_and_verify.sql has succeeded.
-- This file never deletes, truncates or rewrites existing rows and never drops a column.
-- It is safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 0 - BACKUP GUARD (this file refuses to run without a fresh, verified backup)
-- Run 000_backup_and_verify.sql first. This guard re-checks, right now, that live data still equals the backup.
-- If it fails because data changed after the backup (e.g. a user was added), keep the old backup with
--   ALTER SCHEMA backup_stage1 RENAME TO backup_stage1_old_<yyyymmdd>;
-- then run 000 again and retry. (Re-running 001 later, after you have edited users, needs a new backup too.)
-- ---------------------------------------------------------------------
do $guard$
begin
  if to_regprocedure('backup_stage1.verify_backup()') is null then
    raise exception 'No backup found. Run 000_backup_and_verify.sql first. Nothing was changed.';
  end if;
  if exists (select 1 from backup_stage1.verify_backup() where not ok) then
    raise exception 'Backup is stale or does not match live data. Run: select * from backup_stage1.verify_backup(); '
      'then re-create the backup as described above. Nothing was changed.';
  end if;
end
$guard$;

-- ---------------------------------------------------------------------
-- STEP 1 - New columns for bcrypt (existing `password` column stays as it is)
-- ---------------------------------------------------------------------
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists password_migrated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_password_hash_format') then
    alter table public.users
      add constraint users_password_hash_format
      check (password_hash is null or password_hash ~ '^\$2[aby]\$[0-9]{2}\$.{53}$');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- STEP 2 - Indexes on foreign keys / lookup columns (all columns verified from your constraint export
-- and the backend code). Indexes change no data.
-- ---------------------------------------------------------------------
create index if not exists idx_users_email_lower          on public.users (lower(email));
create index if not exists idx_users_role                 on public.users (role);
create index if not exists idx_vehicles_customer          on public.vehicles (customer_id);
create index if not exists idx_sr_customer                on public.service_requests (customer_id);
create index if not exists idx_sr_vehicle                 on public.service_requests (vehicle_id);
create index if not exists idx_sr_advisor                 on public.service_requests (advisor_id);
create index if not exists idx_sr_manager                 on public.service_requests (manager_id);
create index if not exists idx_sr_technician              on public.service_requests (technician_id);
create index if not exists idx_sr_status                  on public.service_requests (request_status);
create index if not exists idx_techreports_request        on public.technician_reports (request_id);
create index if not exists idx_techreports_technician     on public.technician_reports (technician_id);
create index if not exists idx_inspections_request        on public.inspections (request_id);
create index if not exists idx_inspections_advisor        on public.inspections (advisor_id);
create index if not exists idx_jobcards_inspection        on public.job_cards (inspection_id);
create index if not exists idx_jobcards_technician        on public.job_cards (technician_id);
create index if not exists idx_repair_progress_job        on public.repair_progress (job_card_id);
create index if not exists idx_repair_progress_tech       on public.repair_progress (technician_id);
create index if not exists idx_job_spare_parts_job        on public.job_spare_parts (job_card_id);
create index if not exists idx_job_spare_parts_part       on public.job_spare_parts (spare_part_id);
create index if not exists idx_invoices_customer          on public.invoices (customer_id);
create index if not exists idx_invoices_admin             on public.invoices (admin_id);
create index if not exists idx_payments_customer          on public.payments (customer_id);
create index if not exists idx_history_customer           on public.service_history (customer_id);
create index if not exists idx_history_vehicle            on public.service_history (vehicle_id);
create index if not exists idx_history_job                on public.service_history (job_card_id);
create index if not exists idx_notifications_customer     on public.notifications (customer_id);
create index if not exists idx_bill_details_prepared_by   on public.bill_details (prepared_by);

-- ---------------------------------------------------------------------
-- NOT in this file (on purpose):
--   * hashing existing passwords  -> node scripts/migrate-passwords.js  (dry run first)
--   * dropping users.password     -> only after every user is migrated and login is tested
--   * Row Level Security          -> migrations/drafts/ (waiting for your key-type confirmation)
-- ---------------------------------------------------------------------
