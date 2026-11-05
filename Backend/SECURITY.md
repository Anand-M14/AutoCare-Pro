# AutoCare Pro – Stage 1 security guide

## 1. Which Supabase key is my `SUPABASE_KEY`?

Run (it prints the key *type* only, never the key):

    npm run check:key

Or look at the first characters of the value in your `.env`:

| Key starts with / decodes to                | Type                         | Where it may live            |
|---------------------------------------------|------------------------------|------------------------------|
| `sb_publishable_…`                          | publishable (anon-equivalent)| browser, subject to RLS      |
| `sb_secret_…`                               | secret (service-role)        | **backend only**, bypasses RLS |
| `eyJ…` JWT whose payload says `"anon"`      | legacy anon                  | browser, subject to RLS      |
| `eyJ…` JWT whose payload says `"service_role"` | legacy service role       | **backend only**, bypasses RLS |

Dashboard check: Project Settings → API Keys shows both keys with their labels.

## 2. Rotating keys safely (old keys stay valid until step 6)

1. **JWT secret (app logins):** `npm run generate:secret`, put the output in `.env` as `JWT_SECRET`, restart the API. Everyone is signed out once; that is expected.
2. **Supabase key:** Dashboard → Project Settings → API Keys → create a *new* secret key (label it `autocare-backend`).
3. Put it in `.env` as `SUPABASE_SERVICE_ROLE_KEY=` (it takes priority over `SUPABASE_KEY`). Leave the old value in place for now.
4. Restart, run `npm run check:key` (should say SECRET) and log in as each role.
5. Run `npm test`, then use the app for a while (users, requests, advisor/technician flows).
6. Only when everything works: delete/disable the old key in the dashboard (and the legacy JWT secret if you use legacy keys), then remove `SUPABASE_KEY` from `.env`.
7. Never commit `.env`; it is git-ignored. Share only `.env.example`.

Why rotate: the original backend ZIP contained a real `.env`.

## 3. Database migration and password migration - exact order

Nothing here enables RLS, drops a column or edits existing user data until step 7.

1. **Backup:** run `migrations/000_backup_and_verify.sql`. It refuses to run if `backup_stage1` already has objects,
   creates fresh copies of `users`, `vehicles`, `service_requests`, compares row counts and an md5 fingerprint of every row
   against the live tables, and rolls everything back if anything differs.
2. **Verify:** run `select * from backup_stage1.verify_backup();` - every row must show `ok = true` and the row counts must be
   the numbers you expect (e.g. 7 users). Re-run it any time; `ok = false` means live data changed after the backup
   (`live_matches_backup`) or the backup itself was altered (`backup_intact`).
3. **Stale backup?** Keep it, do not delete it: `ALTER SCHEMA backup_stage1 RENAME TO backup_stage1_old_<yyyymmdd>;` then run 000 again.
4. **Schema change:** run `migrations/001_stage1_security.sql`. It first re-checks the backup (and stops if it is stale), then only
   adds `users.password_hash`, `users.password_migrated_at`, a hash-format check and indexes. No rows are modified.
5. Start the API and log in with each existing account (legacy passwords still work while `ALLOW_LEGACY_PLAINTEXT_LOGIN=true`).
6. **Hash passwords:**
   * Dry run: `npm run migrate:passwords` (reads all users page by page, prints counts, changes nothing).
   * Apply: `npm run migrate:passwords -- --apply --i-have-a-backup` (writes `password_hash` only where it is still NULL;
     the plain `password` column is not touched; only user ids are ever printed).
7. Test every login again, set `ALLOW_LEGACY_PLAINTEXT_LOGIN=false`, test again. Only then ask for the SQL that blanks/drops
   `users.password`. Finally `DROP SCHEMA backup_stage1 CASCADE;` (the backup holds plain-text passwords).

Automated checks: `npm test` (all) or `node --test tests/migrate-passwords.test.js` (migration script only).

## 4. Row Level Security – waiting for your confirmation

Nothing in this release enables RLS. `migrations/drafts/RLS_DRAFT_DO_NOT_RUN.sql` is a draft.
If `npm run check:key` reports a SECRET / service_role key, the backend bypasses RLS and enabling RLS with no
policies simply locks the anon/publishable key out of every table (the browser never needs database access,
because it only talks to this API). If it reports a publishable/anon key, do **not** enable RLS before switching keys.

## 5. What the API now enforces

* Every route except `POST /api/auth/login` and `GET /api/health` requires a valid Bearer JWT (HS256, 8 h).
* The user is re-loaded from the database on each request: role changes / deactivation apply immediately.
* Roles: users → Admin; manager → Manager, Admin; advisor → Service Advisor, Admin; technician → Technician;
  requests: view = Admin/Manager/Advisor/Customer (customers see only their own, advisors only theirs),
  create = Customer/Admin, update = Admin/Manager, delete = Admin.
* Advisors/technicians can only act on requests assigned to them; the acting user id always comes from the token.
* Passwords are never returned; login errors do not reveal whether an email exists; login is rate-limited.
* Users with vehicles or service records cannot be deleted (`service_requests.customer_id` is `ON DELETE CASCADE`);
  set them to Inactive instead.
* CORS only allows origins listed in `CORS_ORIGINS`.
