export function Page({ children }) {
  return <div className="ui-page">{children}</div>;
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="ui-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ui-head-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ title, note, action, children, flush = false, className = "" }) {
  return (
    <section className={`ui-panel ${className}`}>
      {(title || action) && (
        <div className="ui-panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {note && <small>{note}</small>}
          </div>
          {action}
        </div>
      )}
      {flush ? children : <div className="ui-panel-body">{children}</div>}
    </section>
  );
}
