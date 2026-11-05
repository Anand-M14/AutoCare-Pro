// Branded, responsive HTML emails. All dynamic text is HTML-escaped.
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const shell = (name, title, bodyHtml, cta) => `<!doctype html><html><body style="margin:0;background:#0d0b0a;font-family:Segoe UI,Arial,sans-serif;color:#E8D2B5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0b0a;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#171312;border:1px solid #3a2f2a;border-radius:16px;overflow:hidden">
<tr><td style="background:#590907;padding:20px 28px;font-size:18px;letter-spacing:.18em;font-weight:700;color:#E8D2B5">${esc(name).toUpperCase()}</td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 14px;font-size:22px;color:#E8D2B5">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.65;color:#cfc6b8">${bodyHtml}</div>
${cta ? `<p style="margin:26px 0 0"><a href="${esc(cta.url)}" style="background:#590907;color:#E8D2B5;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block;border:1px solid #8a5a4a">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #3a2f2a;font-size:12px;color:#A5A79B">${esc(name)} - car &amp; bike service centre. This is an automated message.</td></tr>
</table></td></tr></table></body></html>`;

const rows = (pairs) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0;width:100%">${pairs.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 0;color:#A5A79B;width:42%">${esc(k)}</td><td style="padding:6px 0;color:#E8D2B5;font-weight:600">${esc(v)}</td></tr>`).join("")}</table>`;
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<br\s*\/?>|<\/(p|tr|h1|div)>/g, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();

export const templates = {
  welcome: ({ brand, appUrl, name }) => ({
    subject: `Welcome to ${brand}`,
    html: shell(brand, `Welcome, ${name}`, `<p>Your account is ready. You can now add your cars and bikes and book a service online.</p>`, { url: `${appUrl}/login`, label: "Sign in" }),
  }),
  bookingConfirmation: ({ brand, appUrl, name, request, vehicle }) => ({
    subject: `Booking received - ${request.request_number}`,
    html: shell(brand, "We have received your booking", `<p>Hi ${esc(name)}, your service request is waiting for approval.</p>${rows([
      ["Reference", request.request_number], ["Vehicle", vehicle], ["Service", request.service_type],
      ["Preferred date", request.preferred_date], ["Preferred time", request.preferred_time]])}`, { url: `${appUrl}/customer`, label: "Track your booking" }),
  }),
  requestApproved: ({ brand, appUrl, name, request, vehicle }) => ({
    subject: `Booking approved - ${request.request_number}`,
    html: shell(brand, "Your booking is approved", `<p>Hi ${esc(name)}, good news: your service has been approved and assigned to a service advisor.</p>${rows([
      ["Reference", request.request_number], ["Vehicle", vehicle], ["Service", request.service_type]])}`, { url: `${appUrl}/customer`, label: "View status" }),
  }),
  requestRejected: ({ brand, appUrl, name, request, vehicle, reason }) => ({
    subject: `Booking update - ${request.request_number}`,
    html: shell(brand, "We could not accept this booking", `<p>Hi ${esc(name)}, unfortunately we cannot take this request.</p>${rows([
      ["Reference", request.request_number], ["Vehicle", vehicle], ["Reason", reason]])}<p>You are welcome to book another slot.</p>`, { url: `${appUrl}/customer`, label: "Book again" }),
  }),
  passwordReset: ({ brand, name, url }) => ({
    subject: `Reset your ${brand} password`,
    html: shell(brand, "Reset your password", `<p>Hi ${esc(name)}, we received a request to reset your password. The link works for 30 minutes and only once. If this was not you, ignore this email.</p>`, { url, label: "Choose a new password" }),
  }),
  passwordChanged: ({ brand, name }) => ({
    subject: `Your ${brand} password was changed`,
    html: shell(brand, "Password changed", `<p>Hi ${esc(name)}, your password was just changed. If this was not you, contact the service centre immediately.</p>`),
  }),
  jobAssigned: ({ brand, appUrl, name, request, vehicle }) => ({
    subject: `New job assigned - ${request.request_number}`,
    html: shell(brand, "A job has been assigned to you", `<p>Hi ${esc(name)}, you have a new vehicle to work on.</p>${rows([
      ["Reference", request.request_number], ["Vehicle", vehicle], ["Service", request.service_type], ["Reported problem", request.customer_problem]])}`, { url: `${appUrl}/technician/requests`, label: "Open my jobs" }),
  }),
  statusUpdate: ({ brand, appUrl, name, request, vehicle, headline, message }) => ({
    subject: `${headline} - ${request.request_number}`,
    html: shell(brand, headline, `<p>Hi ${esc(name)}, ${esc(message)}</p>${rows([["Reference", request.request_number], ["Vehicle", vehicle], ["Service", request.service_type]])}`, { url: `${appUrl}/customer`, label: "View status" }),
  }),
};
export const toText = text;
