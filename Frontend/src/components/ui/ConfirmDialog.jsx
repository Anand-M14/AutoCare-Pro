import { useEffect } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

export default function ConfirmDialog({ title, text, confirmLabel = "Confirm", danger = false, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);
  return createPortal(
    <div className="ui-overlay" style={{ justifyContent: "center", alignItems: "center" }} onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel(); }}>
      <div className="ui-dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="ui-dialog-actions">
          <Button onClick={onCancel} disabled={busy} autoFocus>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
