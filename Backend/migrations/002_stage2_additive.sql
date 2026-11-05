-- =====================================================================
-- AutoCare Pro - migration 002 (ADDITIVE ONLY). Run AFTER 001, in the Supabase SQL editor.
-- Adds columns the new features need. Never drops, renames or rewrites anything; safe to run twice.
-- Every column below is added only if it does not already exist, so columns you already have are kept as they are.
-- =====================================================================

-- Password reset (forgot-password flow). Only a SHA-256 of the token is stored, never the token.
alter table public.users add column if not exists password_reset_token_hash text;
alter table public.users add column if not exists password_reset_expires timestamptz;
create index if not exists idx_users_reset_hash on public.users (password_reset_token_hash) where password_reset_token_hash is not null;

-- Reason shown to the customer when a request is rejected (the reject endpoint writes it).
alter table public.service_requests add column if not exists rejection_reason text;
