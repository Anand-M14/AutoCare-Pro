import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AccountBadge, Avatar, Button, ConfirmDialog, DataTable, EmptyState, Icon, IconButton, Page, PageHeader, Panel, Plate, Select, Sheet } from "../../components/ui";
import UserFormSheet from "./UserFormSheet";
import useAsync from "../../hooks/useAsync";
import useDebounce from "../../hooks/useDebounce";
import useAuth from "../../hook/useAuth";
import { deleteUser, listUsers } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";

const SORTS = [
  { value: "full_name:asc", label: "Name A to Z" },
  { value: "full_name:desc", label: "Name Z to A" },
  { value: "email:asc", label: "Email A to Z" },
];

/**
 * One list page for customers and employees.
 *  mode="customers": Admin edits; Manager and Service Advisor can look up (read-only).
 *  mode="staff": Admin only.
 */
export default function People({ mode }) {
  const { user: me } = useAuth();
  const isStaff = mode === "staff";
  const canEdit = me.role === "Admin";
  const noun = isStaff ? "employee" : "customer";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [sort, setSort] = useState("full_name:asc");
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);

  useEffect(() => { setPage(1); }, [dq, status, role, sort]);

  const [sk, sd] = sort.split(":");
  const { data, loading, error, reload } = useAsync(
    () => listUsers({ page, limit: 10, group: mode, q: dq || undefined, status: status || undefined, role: role || undefined, sort: sk, dir: sd, include: isStaff ? undefined : "vehicles" }),
    [page, dq, status, role, sort, mode]
  );

  const [form, setForm] = useState(null);       // { user? }
  const [detail, setDetail] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const closeForm = useCallback(() => setForm(null), []);
  const closeDetail = useCallback(() => setDetail(null), []);

  const confirmDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteUser(removing.id);
      toast.success(`${removing.full_name} deleted`);
      setRemoving(null);
      if (data?.rows.length === 1 && page > 1) setPage(page - 1); else reload();
    } catch (err) {
      toast.error(errorMessage(err, `Could not delete the ${noun}.`));
    } finally { setBusy(false); }
  };

  const filtered = Boolean(dq || status || role);
  const columns = [
    { key: "name", label: "Name", main: true, sortKey: null, render: (u) => (
      <div className="cell-id"><Avatar name={u.full_name} /><div><strong>{u.full_name}</strong><span>{u.email}</span></div></div>) },
    { key: "phone", label: "Phone", render: (u) => <span className="num">{u.phone}</span> },
    isStaff
      ? { key: "role", label: "Role", render: (u) => u.role }
      : { key: "veh", label: "Vehicles", render: (u) => (u.vehicles?.length
          ? <span className="ui-hint-row">{u.vehicles.slice(0, 2).map((v) => <Plate key={v.id} number={v.registration_number} type={v.vehicle_type} small />)}{u.vehicles.length > 2 && <small style={{ color: "var(--text-3)" }}>+{u.vehicles.length - 2}</small>}</span>
          : <span style={{ color: "var(--text-3)" }}>None yet</span>) },
    { key: "status", label: "Status", render: (u) => <AccountBadge status={u.status} /> },
    { key: "act", label: "Actions", actions: true, render: (u) => (
      <div className="row-actions">
        {!isStaff && <IconButton icon="eye" label={`View ${u.full_name}`} onClick={() => setDetail(u)} />}
        {canEdit && <IconButton icon="edit" label={`Edit ${u.full_name}`} onClick={() => setForm({ user: u })} />}
        {canEdit && u.id !== me.id && <IconButton icon="trash" label={`Delete ${u.full_name}`} onClick={() => setRemoving(u)} />}
      </div>) },
  ];

  return (
    <Page>
      <PageHeader
        title={isStaff ? "Employees" : "Customers"}
        description={isStaff ? "Managers, service advisors, technicians and admins." : "Everyone who books a car or bike with the workshop."}
        actions={canEdit && <Button variant="primary" icon="plus" onClick={() => setForm({})}>{`Add ${noun}`}</Button>}
      />
      <Panel flush>
        <div className="ui-toolbar">
          <label className="ui-field-inline" style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
            <Icon name="search" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" aria-label={`Search ${noun}s`} />
          </label>
          {isStaff && (
            <label className="ui-field-inline"><select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>{["Admin", "Manager", "Service Advisor", "Technician"].map((r) => <option key={r}>{r}</option>)}
            </select></label>
          )}
          <label className="ui-field-inline"><select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option>Active</option><option>Inactive</option>
          </select></label>
          <label className="ui-field-inline"><select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select></label>
        </div>
        <DataTable
          columns={columns} rows={data?.rows} meta={data?.meta} loading={loading} error={error} onRetry={reload}
          onPage={setPage} noun={`${noun}s`}
          empty={filtered
            ? <EmptyState title={`No ${noun}s match these filters`} text="Try a different search or clear the filters." action={<Button onClick={() => { setQ(""); setStatus(""); setRole(""); }}>Clear filters</Button>} />
            : <EmptyState title={`No ${noun}s yet`} text={canEdit ? `Add the first ${noun} to get started.` : undefined} onAction={canEdit ? () => setForm({}) : undefined} actionLabel={`Add ${noun}`} />}
        />
      </Panel>

      {form && <UserFormSheet user={form.user} mode={mode} onClose={closeForm} onSaved={() => { setForm(null); reload(); }} />}

      {detail && (
        <Sheet title={detail.full_name} description="Customer details" onClose={closeDetail}>
          <dl className="ui-kv">
            <dt>Email</dt><dd>{detail.email}</dd>
            <dt>Phone</dt><dd>{detail.phone}</dd>
            <dt>Account</dt><dd><AccountBadge status={detail.status} /></dd>
          </dl>
          <div>
            <h3 className="ui-section-title">Vehicles</h3>
            {detail.vehicles?.length ? (
              <ul className="ui-list-plain">
                {detail.vehicles.map((v) => (
                  <li key={v.id}><span>{[v.brand, v.model].filter(Boolean).join(" ") || "Vehicle"}</span><Plate number={v.registration_number} type={v.vehicle_type} small /></li>
                ))}
              </ul>
            ) : <p style={{ color: "var(--text-2)" }}>No vehicles registered yet.</p>}
          </div>
        </Sheet>
      )}

      {removing && (
        <ConfirmDialog
          danger busy={busy} title={`Delete ${removing.full_name}?`} confirmLabel="Delete"
          text={`This permanently removes the ${noun} account. If they have vehicles or service records the deletion is blocked, and you can set the account to Inactive instead.`}
          onConfirm={confirmDelete} onCancel={() => !busy && setRemoving(null)}
        />
      )}
    </Page>
  );
}
