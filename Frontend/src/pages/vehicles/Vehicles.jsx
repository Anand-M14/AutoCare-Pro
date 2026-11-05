import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Button, ConfirmDialog, EmptyState, Icon, IconButton, Page, PageHeader, Pagination, Plate, Segmented, Sheet, Skeleton, StatusBadge } from "../../components/ui";
import VehicleSheet from "./VehicleSheet";
import BookingSheet from "../booking/BookingSheet";
import useAsync from "../../hooks/useAsync";
import useDebounce from "../../hooks/useDebounce";
import useAuth from "../../hook/useAuth";
import { deleteVehicle, listVehicles, vehicleHistory } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { fmtDate, isBike } from "../../lib/format";

const TYPES = [{ value: "", label: "All" }, { value: "Car", label: "Cars", icon: "car" }, { value: "Bike", label: "Bikes", icon: "bike" }];

export default function Vehicles() {
  const { user } = useAuth();
  const isCustomer = user.role === "Customer";
  const canDelete = isCustomer || user.role === "Admin";
  const canWrite = isCustomer || user.role === "Admin" || user.role === "Service Advisor";
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounce(q);
  useEffect(() => { setPage(1); }, [dq, type]);
  const { data, loading, error, reload } = useAsync(() => listVehicles({ page, limit: 12, q: dq || undefined, type: type || undefined }), [page, dq, type]);

  const [form, setForm] = useState(null);       // { vehicle? }
  const [history, setHistory] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteVehicle(removing.id);
      toast.success("Vehicle removed");
      setRemoving(null);
      if (data?.rows.length === 1 && page > 1) setPage(page - 1); else reload();
    } catch (err) { toast.error(errorMessage(err, "Could not remove this vehicle.")); setRemoving(null); }
    finally { setBusy(false); }
  };

  const rows = data?.rows || [];
  return (
    <Page>
      <PageHeader
        title={isCustomer ? "My garage" : "Vehicles"}
        description={isCustomer ? "Your cars and bikes, ready to book." : "Every car and bike registered with the workshop."}
        actions={canWrite && <Button variant="primary" icon="plus" onClick={() => setForm({})}>Add vehicle</Button>}
      />
      <div className="ui-toolbar bare">
        <label className="ui-field-inline" style={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
          <Icon name="search" size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plate, brand or model" aria-label="Search vehicles" />
        </label>
        <Segmented label="Vehicle type" value={type} onChange={setType} options={TYPES} />
      </div>

      {error && <div className="ui-alert" role="alert"><span>{error}</span><Button size="sm" icon="refresh" onClick={reload}>Try again</Button></div>}
      {loading && !data && <div className="garage">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} h={168} style={{ borderRadius: 14 }} />)}</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="ui-panel"><EmptyState
          title={dq || type ? "No vehicles match" : isCustomer ? "Your garage is empty" : "No vehicles yet"}
          text={dq || type ? "Try a different search." : canWrite ? "Add a car or a bike to get started." : undefined}
          onAction={canWrite && !(dq || type) ? () => setForm({}) : undefined} actionLabel="Add vehicle" /></div>
      )}
      {rows.length > 0 && (
        <div className="garage" aria-busy={loading || undefined}>
          {rows.map((v) => (
            <article key={v.id} className="vcard">
              <div className="vcard-top">
                <span className="vcard-ico"><Icon name={isBike(v.vehicle_type) ? "bike" : "car"} size={22} /></span>
                <div><h3>{[v.brand, v.model].filter(Boolean).join(" ") || "Vehicle"}</h3><small>{v.color || (isBike(v.vehicle_type) ? "Bike" : "Car")}{!isCustomer && v.customer?.full_name ? ` · ${v.customer.full_name}` : ""}</small></div>
              </div>
              <Plate number={v.registration_number} type={v.vehicle_type} />
              <div className="vcard-act">
                {isCustomer && <Button size="sm" variant="primary" onClick={() => setBooking(v.id)}>Book service</Button>}
                <Button size="sm" onClick={async () => { setHistory({ vehicle: v, rows: null }); try { setHistory({ vehicle: v, rows: await vehicleHistory(v.id) }); } catch (err) { setHistory(null); toast.error(errorMessage(err, "Could not load the history.")); } }}>History</Button>
                <span className="grow" />
                {canWrite && <IconButton icon="edit" label={`Edit ${v.registration_number}`} onClick={() => setForm({ vehicle: v })} />}
                {canDelete && <IconButton icon="trash" label={`Remove ${v.registration_number}`} onClick={() => setRemoving(v)} />}
              </div>
            </article>
          ))}
        </div>
      )}
      {data?.meta && rows.length > 0 && <div className="ui-panel"><Pagination meta={data.meta} onPage={setPage} noun="vehicles" /></div>}

      {form && <VehicleSheet vehicle={form.vehicle} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      {booking && <BookingSheet vehicleId={booking} onClose={() => setBooking(null)} onBooked={() => setBooking(null)} />}
      {history && (
        <Sheet title="Service history" description={`${history.vehicle.registration_number} · ${[history.vehicle.brand, history.vehicle.model].filter(Boolean).join(" ")}`} onClose={() => setHistory(null)}>
          {!history.rows ? <><Skeleton h={54} /><Skeleton h={54} /></> : history.rows.length === 0 ? (
            <p style={{ color: "var(--text-2)" }}>No service requests for this vehicle yet.</p>
          ) : (
            <ul className="ui-list-plain">
              {history.rows.map((r) => (
                <li key={r.id}><div><strong className="num">{r.request_number}</strong><div style={{ color: "var(--text-3)", fontSize: 13 }}>{r.service_type || "Service"} · {fmtDate(r.created_at)}</div></div><StatusBadge status={r.request_status} /></li>
              ))}
            </ul>
          )}
        </Sheet>
      )}
      {removing && <ConfirmDialog danger busy={busy} title={`Remove ${removing.registration_number}?`} confirmLabel="Remove" text="Vehicles with service records cannot be removed. This cannot be undone." onConfirm={confirmDelete} onCancel={() => !busy && setRemoving(null)} />}
    </Page>
  );
}
