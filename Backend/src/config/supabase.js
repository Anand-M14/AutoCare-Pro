import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { env } from "./env.js";

// Never log the URL or key.
// Test hook: lets the test-suite inject an in-memory client (never active outside NODE_ENV=test).
const injected = process.env.NODE_ENV === "test" ? globalThis.__acSupabase : undefined;

const supabase = injected || createClient(env.supabaseUrl, env.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws },
});

export default supabase;
