import Icon from "./Icon";

export default function Button({ variant = "default", size, icon, loading = false, children, className = "", type = "button", disabled, ...rest }) {
  const cls = ["ui-btn", variant !== "default" ? variant : "", size === "sm" ? "sm" : "", className].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="ui-spin" aria-hidden="true" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, className = "", ...rest }) {
  return (
    <button type="button" className={`ui-iconbtn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
