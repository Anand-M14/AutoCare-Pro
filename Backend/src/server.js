import { env } from "./config/env.js"; // validates configuration first
import app from "./app.js";

const server = app.listen(env.port, () => {
  console.log(`AutoCare Pro API listening on port ${env.port} (${env.nodeEnv})`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
