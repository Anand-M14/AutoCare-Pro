const windowPages = (page, pages) => {
  const out = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let p = start; p <= Math.min(pages, start + 4); p++) out.push(p);
  return out;
};

export default function Pagination({ meta, onPage, noun = "results" }) {
  if (!meta) return null;
  const { page, limit, total, pages } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="ui-foot">
      <span>{total === 0 ? `No ${noun}` : `Showing ${from} to ${to} of ${total} ${noun}`}</span>
      {pages > 1 && (
        <nav className="ui-pager" aria-label="Pagination">
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
          {windowPages(page, pages).map((p) => (
            <button key={p} type="button" aria-current={p === page ? "page" : undefined} onClick={() => onPage(p)}>{p}</button>
          ))}
          <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
        </nav>
      )}
    </div>
  );
}
