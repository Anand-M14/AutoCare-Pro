import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";
import Button from "./Button";
import Pagination from "./Pagination";
import Icon from "./Icon";

/**
 * columns: [{ key, label, sortKey?, render(row), main?, actions?, className? }]
 * Renders skeleton rows while loading, an error with retry, an empty state, then the rows.
 * On phones every row turns into a stacked record (see ui.css).
 */
export default function DataTable({ columns, rows, loading, error, onRetry, sort, onSort, meta, onPage, noun, empty, rowKey = (r) => r.id }) {
  const showRows = !error && rows && rows.length > 0;
  return (
    <>
      {error && (
        <div style={{ padding: 18 }}>
          <div className="ui-alert" role="alert"><span>{error}</span>{onRetry && <Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}</div>
        </div>
      )}
      {!error && (
        <div className="ui-tablewrap" aria-busy={loading || undefined}>
          <table className="ui-table">
            <thead>
              <tr>
                {columns.map((c) => {
                  const active = sort && c.sortKey && sort.key === c.sortKey;
                  return (
                    <th key={c.key} aria-sort={active ? (sort.dir === "desc" ? "descending" : "ascending") : undefined}>
                      {c.sortKey && onSort ? (
                        <button type="button" onClick={() => onSort(c.sortKey)}>{c.label}<Icon name="chevron" size={12} style={{ transform: active && sort.dir === "asc" ? "rotate(180deg)" : "none", opacity: active ? 1 : 0.35 }} /></button>
                      ) : c.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && !showRows && Array.from({ length: 5 }, (_, i) => (
                <tr key={`s${i}`}>{columns.map((c) => <td key={c.key}><Skeleton w={c.actions ? 90 : "70%"} h={c.main ? 34 : 14} /></td>)}</tr>
              ))}
              {showRows && rows.map((row) => (
                <tr key={rowKey(row)} style={loading ? { opacity: 0.6 } : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} data-label={c.label} className={[c.main ? "cell-main" : "", c.actions ? "cell-actions" : "", c.className || ""].join(" ")}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !showRows && <div>{empty || <EmptyState title="Nothing here yet" />}</div>}
        </div>
      )}
      {!error && meta && <Pagination meta={meta} onPage={onPage} noun={noun} />}
    </>
  );
}
