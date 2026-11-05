# AutoCare Pro - frontend (React + Vite)

    npm install
    cp .env.example .env     # dev: leave VITE_API_URL empty, Vite proxies /api to DEV_API_TARGET
    npm run dev              # http://localhost:5173
    npm run build            # production build (set VITE_API_URL to your deployed API first)

Pages by role: Admin (dashboard, requests, vehicles, customers, employees), Manager (dashboard, requests, reports, customers),
Service Advisor (work queue, requests, reports, vehicles, customers), Technician (my bay, my jobs), Customer (garage, vehicles, bookings).
Everyone: profile and password. Auth: login, register, forgot and reset password.
Every page reads live data from the API; nothing is hard-coded.

Not built (their table columns were not available when this was written): inspections, job cards, spare parts / inventory,
invoices, payments, notifications centre, technicians table views. Navigation only lists pages that work.
