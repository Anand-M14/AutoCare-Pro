-- =====================================================================
-- DRAFT - DO NOT RUN until:
--   1. `npm run check:key` says the backend key is a SECRET / service_role key, and
--   2. you have tested the whole app with that key.
-- With RLS on and NO policies, the anon/publishable key can read and write NOTHING.
-- The backend (secret / service_role key) bypasses RLS, so the app keeps working.
-- If the backend is still using the publishable/anon key, running this will break the app.
-- =====================================================================
alter table public.users              enable row level security;
alter table public.vehicles           enable row level security;
alter table public.service_requests   enable row level security;
alter table public.technician_reports enable row level security;
alter table public.technicians        enable row level security;
alter table public.inspections        enable row level security;
alter table public.job_cards          enable row level security;
alter table public.repair_progress    enable row level security;
alter table public.spare_parts        enable row level security;
alter table public.job_spare_parts    enable row level security;
alter table public.bill_details       enable row level security;
alter table public.invoices           enable row level security;
alter table public.payments           enable row level security;
alter table public.service_history    enable row level security;
alter table public.notifications      enable row level security;

-- Roll back (if something breaks):  alter table public.<name> disable row level security;
-- Per-user policies (auth.uid() = ...) are intentionally NOT created: users are authenticated by this
-- backend's own JWT, not by Supabase Auth, so the browser never talks to the database directly.
