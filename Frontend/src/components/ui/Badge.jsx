import { statusInfo } from "../../lib/status";

export default function Badge({ tone = "wait", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const [tone, label] = statusInfo(status);
  return <Badge tone={tone}>{label}</Badge>;
}

export function AccountBadge({ status }) {
  const active = String(status || "Active").toLowerCase() !== "inactive";
  return <Badge tone={active ? "live" : "wait"}>{active ? "Active" : "Inactive"}</Badge>;
}
