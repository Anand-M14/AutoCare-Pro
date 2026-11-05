import Button from "./Button";

// Original line illustration: a car and a bike side by side.
export function Garage() {
  return (
    <svg viewBox="0 0 160 70" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 52h148" strokeDasharray="2 6" opacity=".6" />
      <path d="M12 46l5-14a6 6 0 0 1 5.6-4h28a6 6 0 0 1 5.6 4l5.8 14M10 46h50v6H10z" />
      <circle cx="26" cy="52" r="6" /><circle cx="46" cy="52" r="6" />
      <circle cx="98" cy="50" r="9" /><circle cx="142" cy="50" r="9" />
      <path d="M98 50l12-22h18l14 22M128 28l-5-9h-8M110 28l9 22h-21" />
    </svg>
  );
}

export default function EmptyState({ title, text, action, onAction, actionLabel }) {
  return (
    <div className="ui-empty">
      <Garage />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action || (onAction && <Button variant="primary" onClick={onAction}>{actionLabel}</Button>)}
    </div>
  );
}
