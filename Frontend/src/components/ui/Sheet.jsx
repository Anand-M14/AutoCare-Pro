import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./Button";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Right-hand drawer with focus trap, Esc to close and scroll lock. */
export default function Sheet({ title, description, onClose, children, footer, busy = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector(FOCUSABLE)?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const els = [...ref.current.querySelectorAll(FOCUSABLE)];
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [onClose, busy]);

  return createPortal(
    <div className="ui-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="ui-sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="ui-sheet-head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          <IconButton icon="x" label="Close" onClick={onClose} disabled={busy} />
        </div>
        <div className="ui-sheet-body">{children}</div>
        {footer && <div className="ui-sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
