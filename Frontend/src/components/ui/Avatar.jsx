const initials = (name = "") =>
  name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "U";

export default function Avatar({ name, size = 34 }) {
  return <span className="ui-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials(name)}</span>;
}
