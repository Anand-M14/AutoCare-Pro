import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, DataTable, EmptyState, Icon, Page, PageHeader, Panel, Plate, Skeleton, StatusBadge } from "../../components/ui";
import Timeline from "../../components/requests/Timeline";
import BookingSheet from "../booking/BookingSheet";
import useAsync from "../../hooks/useAsync";
import useAuth from "../../hook/useAuth";
import { fetchRoleHome } from "../../services/apiServices";
import { fmtDate, timeAgo } from "../../lib/format";
import { isOpen } from "../../lib/status";
import car from "../../assets/car.webp";

const SEGMENT = { "Service Advisor": "advisor", Technician: "technician", Customer: "customer" };
const firstName = (u) => (u.full_name || u.email || "").split(" ")[0];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function RoleHome() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => fetchRoleHome(SEGMENT[user.role]), [user.role]);
  const [booking, setBooking] = useState(false);
  if (user.role === "Customer") return <CustomerHome {...{ data, loading, error, reload, booking, setBooking, user }} />;
  return user.role === "Technician" ? <TechnicianHome {...{ data, loading, error, reload, user }} /> : <AdvisorHome {...{ data, loading, error, reload, user }} />;
}

function Err({ error, reload }) {
  return error ? <div className="ui-alert" role="alert"><span>{error}</span><Button size="sm" icon="refresh" onClick={reload}>Try again</Button></div> : null;
}

/* Customer: a garage showroom with the live service tracker. */
function CustomerHome({ data, loading, error, reload, booking, setBooking, user }) {
  const c = data?.cards;
  const active = data?.recentRequests?.find((r) => isOpen(r.request_status));
  return (
    <Page>
      <section className="showroom">
        <div className="showroom-copy">
          <p className="eyebrow">{greeting()}, {firstName(user)}</p>
          <h1>{active ? "Your vehicle is in good hands." : "Ready when you are."}</h1>
          <p>{active ? "Follow every step of your service below." : "Book a service for your car or bike in under a minute."}</p>
          <div className="showroom-actions">
            <Button variant="primary" icon="plus" onClick={() => setBooking(true)}>Book a service</Button>
            <Link to="/customer/vehicles" className="ui-btn">My garage</Link>
          </div>
        </div>
        <img src={car} alt="" className="showroom-car" />
      </section>
      <Err error={error} reload={reload} />
      <section className="ui-strip" aria-label="Summary">
        <Cell loading={loading && !data} k="Vehicles" v={c?.vehicles} />
        <Cell loading={loading && !data} k="Open bookings" v={c?.open} />
        <Cell loading={loading && !data} k="Ready for pickup" v={c?.ready} lead={c?.ready > 0} />
        <Cell loading={loading && !data} k="Completed" v={c?.completed} />
      </section>
      <div className="ui-cols">
        <Panel title={active ? `Tracking ${active.request_number}` : "Service tracker"} note={active ? [active.vehicle?.brand, active.vehicle?.model].filter(Boolean).join(" ") : undefined}>
          {loading && !data ? <Skeleton h={180} /> : active ? <Timeline status={active.request_status} /> : <EmptyState title="No active service" text="When you book a service, its progress appears here." />}
        </Panel>
        <Panel title="Recent bookings" flush action={<Link to="/customer/requests" className="ui-btn ghost sm">View all</Link>}>
          <RecentTable data={data} loading={loading && !data} />
        </Panel>
      </div>
      {booking && <BookingSheet onClose={() => setBooking(false)} onBooked={() => { setBooking(false); reload(); }} />}
    </Page>
  );
}

/* Advisor: a work queue grouped by what needs doing next. */
function AdvisorHome({ data, loading, error, reload, user }) {
  const c = data?.cards;
  const queue = [
    ["Advisor Assigned", "Assign a technician", c?.awaitingTechnician, "wrench"],
    ["Report Submitted", "Verify technician reports", c?.reportsToVerify, "clipboard"],
    ["Manager Approved", "Mark vehicles ready", null, "check"],
  ];
  return (
    <Page>
      <PageHeader title={`${greeting()}, ${firstName(user)}`} description="What needs your attention first." />
      <Err error={error} reload={reload} />
      <section className="queue">
        {queue.map(([status, label, n, icon]) => (
          <Link key={status} to={`/advisor/requests?status=${encodeURIComponent(status)}`} className="queue-card">
            <Icon name={icon} size={22} />
            <b className="num">{loading && !data ? "–" : n ?? "Open"}</b>
            <span>{label}</span>
          </Link>
        ))}
      </section>
      <section className="ui-strip" aria-label="Summary">
        <Cell loading={loading && !data} k="Waiting for a technician" v={c?.awaitingTechnician} />
        <Cell loading={loading && !data} k="In repair" v={c?.inRepair} />
        <Cell loading={loading && !data} k="Reports to verify" v={c?.reportsToVerify} lead={c?.reportsToVerify > 0} />
        <Cell loading={loading && !data} k="Completed" v={c?.completed} />
      </section>
      <Panel title="Recent requests" flush action={<Link to="/advisor/requests" className="ui-btn ghost sm">View all</Link>}>
        <RecentTable data={data} loading={loading && !data} showCustomer />
      </Panel>
    </Page>
  );
}

/* Technician: big, glanceable job cards for use at the bay. */
function TechnicianHome({ data, loading, error, reload, user }) {
  const c = data?.cards;
  return (
    <Page>
      <PageHeader title={`${greeting()}, ${firstName(user)}`} description="Your jobs for today." actions={<Link to="/technician/requests" className="ui-btn primary">Open my jobs</Link>} />
      <Err error={error} reload={reload} />
      <section className="bay-counts" aria-label="Summary">
        <Big loading={loading && !data} k="To start" v={c?.toStart} />
        <Big loading={loading && !data} k="In progress" v={c?.inProgress} lead />
        <Big loading={loading && !data} k="Report due" v={c?.reportDue} />
        <Big loading={loading && !data} k="Done" v={c?.done} />
      </section>
      <Panel title="Latest jobs" flush action={<Link to="/technician/requests" className="ui-btn ghost sm">All jobs</Link>}>
        <RecentTable data={data} loading={loading && !data} showCustomer />
      </Panel>
    </Page>
  );
}

function RecentTable({ data, loading, showCustomer }) {
  return (
    <DataTable
      loading={loading} rows={data?.recentRequests} noun="requests"
      empty={<EmptyState title="Nothing here yet" text="Requests will show up here as they come in." />}
      columns={[
        { key: "no", label: "Request", main: true, render: (r) => <b className="num" style={{ fontSize: 15 }}>{r.request_number}</b> },
        { key: "ve", label: "Vehicle", render: (r) => <Plate number={r.vehicle?.registration_number} type={r.vehicle?.vehicle_type} small /> },
        ...(showCustomer ? [{ key: "cu", label: "Customer", render: (r) => r.customer?.full_name || "Unknown" }] : []),
        { key: "st", label: "Status", render: (r) => <StatusBadge status={r.request_status} /> },
        { key: "wh", label: "Booked", render: (r) => <span style={{ color: "var(--text-3)" }} title={fmtDate(r.created_at)}>{timeAgo(r.created_at)}</span> },
      ]}
    />
  );
}

const Cell = ({ k, v, lead, loading }) => (
  <div className={lead ? "lead" : undefined}><div className="k">{k}</div><div className="v">{loading ? <Skeleton w={60} h={32} /> : v ?? 0}</div></div>
);
const Big = ({ k, v, lead, loading }) => (
  <div className={`big${lead ? " lead" : ""}`}><b className="num">{loading ? "–" : v ?? 0}</b><span>{k}</span></div>
);
