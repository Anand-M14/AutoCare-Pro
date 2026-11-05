import { useId } from "react";

/** Label + control + hint/error wired together for screen readers. */
export function Field({ label, error, hint, children, className = "" }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const control = typeof children === "function" ? children({ id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) || undefined }) : children;
  return (
    <div className={`ui-field${error ? " bad" : ""} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? <span id={`${id}-err`} className="err" role="alert">{error}</span> : hint ? <span id={`${id}-hint`} className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = (props) => <input className="ui-input" {...props} />;
export const Textarea = (props) => <textarea className="ui-textarea" {...props} />;
export function Select({ children, ...props }) {
  return <select className="ui-select" {...props}>{children}</select>;
}
