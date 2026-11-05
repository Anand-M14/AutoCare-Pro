import crypto from "node:crypto";
// Prints a new random secret. Copy it into your .env as JWT_SECRET - never commit it.
console.log(crypto.randomBytes(64).toString("hex"));
