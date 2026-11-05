import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development, "/api" is proxied to the Express server so no absolute URL is hard-coded in the app.
// For production set VITE_API_URL to the deployed API (for example https://api.example.com/api).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: { proxy: { "/api": env.DEV_API_TARGET || "http://localhost:5000" } },
  };
});
