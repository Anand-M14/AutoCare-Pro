# AutoCare Pro - API (Express 5 + Supabase)

    npm install
    cp .env.example .env     # fill SUPABASE_URL, SUPABASE_KEY, JWT_SECRET (node scripts/generate-secret.js), SENDGRID_*
    npm start
    npm test                 # 42 tests, no network or database needed

## Database order (nothing runs automatically; run in the Supabase SQL editor)
1. migrations/000_backup_and_verify.sql, then verify the backup counts
2. migrations/001_stage1_security.sql
3. migrations/002_stage2_additive.sql (adds password-reset columns and rejection_reason; additive, safe to repeat)
4. node scripts/migrate-passwords.js (bcrypt migration; the plain-text password column is NOT dropped)
migrations/drafts/RLS_DRAFT_DO_NOT_RUN.sql is a draft only. RLS stays off until you approve it.

See docs/SECURITY.md for key handling and rotation.
