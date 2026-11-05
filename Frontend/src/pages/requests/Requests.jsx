import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, DataTable, EmptyState, Icon, Page, PageHeader, Panel, Plate, StatusBadge } from "../../components/ui";
import RequestSheet from "./RequestSheet";
import BookingSheet from "../booking/BookingSheet";
import useAsync from "../../hooks/useAsync";
import useDebounce from "../../hooks/useDebounce";
import useAuth from "../../hook/useAuth";
import { listRequests } from "../../services/apiServices";
import { STATUS_OPTIONS, statusInfo } from "../../lib/status";
import { fmtDate } from "../../lib/format";

const COPY = {
  Customer: ["My bookings", "Every service you have booked and where it stands."],
  "Service Advisor": ["Assigned requests", "Vehicles assigned to you, from technician hand-off to handover."],
  Manager: ["Service requests", "Approve new bookings and follow every vehicle in the workshop."],
  Admin: ["Service requests", "All bookings across the workshop."],
};
const SORTS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "request_number:asc", label: "Request number" },
];

export default function Requests() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialStatus = STATUS_OPTIONS.includes(params.get("status")) ? params.get("status") : "";
  const [title, description] = COPY[user.role] || COPY.Admin;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [sort, setSort] = useState("created_at:desc");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [booking, setBooking] = useState(false);
  const dq = useDebounce(q);
  useEffect(() => { setPage(1); }, [dq, status, sort]);

  const [sk, sd] = sort.split(":");
  const { data, loading, error, reload } = useAsync(
    () => listRequests({ page, limit: 10, q: dq || undefined, status: status || undefined, sort: sk, dir: sd }), [page, dq, status, sort]);
  const filtered = Boolean(dq || status);
  const canBook = user.role === "Customer";

  const columns = [
    { key: "no", label: "Request", main: true, render: (r) => (
      <div className="cell-id"><div><strong className="num">{r.request_number}</strong><span>{r.service_type || "Service"}</span></div></div>) },
    { key: "ve", label: "Vehicle", render: (r) => <span className="stack"><Plate number={r.vehicle?.registration_number} type={r.vehicle?.vehicle_type} small /><small>{[r.vehicle?.brand, r.vehicle?.model].filter(Boolean).join(" ")}</small></span> },
    ...(user.role !== "Customer" ? [{ key: "cu", label: "Customer", render: (r) => r.customer?.full_name || "Unknown" }] : []),
    { key: "st", label: "Status", render: (r) => <StatusBadge status={r.request_status} /> },
    { key: "dt", label: "Preferred date", render: (r) => <span className="num">{fmtDate(r.preferred_date) || "Not set"}</span> },
    { key: "act", label: "", actions: true, render: (r) => <Button size="sm" onClick={() => setOpen(r.id)}>Open</Button> },
  ];

  return (
    <Page>
      <PageHeader title={title} description={description} actions={canBook && <Button variant="primary" icon="plus" onClick={() => setBooking(true)}>Book a service</Button>} />
      <Panel flush>
        <div className="ui-toolbar">
          <label className="ui-field-inline" style={{ flex: 1, minWidth: 200, maxWidth: 360 }}>
            <Icon name="search" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by request number" aria-label="Search requests" />
          </label>
          <label className="ui-field-inline"><select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusInfo(s)[1]}</option>)}
          </select></label>
          <label className="ui-field-inline"><select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select></label>
        </div>
        <DataTable columns={columns} rows={data?.rows} meta={data?.meta} loading={loading} error={error} onRetry={reload} onPage={setPage} noun="requests"
          empty={filtered
            ? <EmptyState title="No requests match these filters" action={<Button onClick={() => { setQ(""); setStatus(""); }}>Clear filters</Button>} />
            : <EmptyState title="No service requests yet" text={canBook ? "Book your first service to see it here." : "New bookings will appear here."} onAction={canBook ? () => setBooking(true) : undefined} actionLabel="Book a service" />} />
      </Panel>
      {open && <RequestSheet id={open} onClose={() => setOpen(null)} onChanged={reload} />}
      {booking && <BookingSheet onClose={() => setBooking(false)} onBooked={() => { setBooking(false); reload(); }} />}
    </Page>
  );
}
