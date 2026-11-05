import { env } from "../../config/env.js";
import { brand } from "./brand.js";
import { templates, toText } from "./templates.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Test seam: replaced in tests so no network is used. */
export const transport = {
  async send(payload) {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.sendgridApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw Object.assign(new Error("SendGrid rejected the message"), { status: res.status });
  },
};

/**
 * Sends one templated email. NEVER throws: a mail failure must not roll back a booking, a payment or a password change.
 * Returns "sent" | "skipped" | "failed". Logs the template and status only (no addresses, tokens or API keys).
 */
export const sendEmail = async (template, to, data) => {
  try {
    if (!env.sendgridApiKey || !env.mailFrom) { console.warn(`[email] ${template}: skipped (SendGrid is not configured)`); return "skipped"; }
    if (!EMAIL.test(String(to || ""))) { console.warn(`[email] ${template}: skipped (invalid recipient)`); return "skipped"; }
    const { subject, html } = templates[template]({ brand: brand.name, appUrl: env.appUrl, ...data });
    await transport.send({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: env.mailFrom, name: env.mailFromName },
      subject,
      content: [{ type: "text/plain", value: toText(html) }, { type: "text/html", value: html }],
    });
    console.log(`[email] ${template}: sent`);
    return "sent";
  } catch (e) {
    console.error(`[email] ${template}: failed (${e?.status || e?.name || "error"})`);
    return "failed";
  }
};
