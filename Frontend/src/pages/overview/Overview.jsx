import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, DataTable, EmptyState, Page, PageHeader, Panel, Plate, Segmented, Skeleton, StatusBadge } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import useAuth from "../../hook/useAuth";
import { fetchOverview } from "../../services/apiServices";
import { homeFor } from "../../lib/roles";
import { timeAgo } from "../../lib/format";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];
const RANGE_TEXT = { today: "today", "7d": "in the last 7 days", "30d": "in the last 30 days" };
const TYPE_COLOURS = ["var(--cream)", "var(--ox-glow)", "var(--ash)"];

export default function Overview() {
  const { user } = useAuth();
  const base = homeFor(user.role);
  const [range, setRange] = useState("7d");
  const { data, loading, error, reload, refresh } = useAsync(() => fetchOverview(range), [range]);

  // keep the board live without a spinner
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) refresh(); }, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  const t = data?.totals;
  const typeTotal = data?.vehiclesByType.reduce((n, x) => n + x.count, 0) || 0;

  return (
    <Page>
      <PageHeader
        title="Workshop today"
        description="Every vehicle in the workshop, from booking to handover."
        actions={<>
          <Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />
          <Link to={`${base}/requests`} className="ui-btn primary">View requests</Link>
        </>}
      />

      {error && <div className="ui-alert" role="alert"><span>{error}</span><Button size="sm" icon="refresh" onClick={reload}>Try again</Button></div>}

      <section className="ui-strip" aria-label="Summary">
        <Stat loading={loading && !data} k="Vehicles in workshop" v={t?.inWorkshop} s={t ? `${t.vehicles} registered in total` : ""} lead />
        <Stat loading={loading && !data} k="Waiting for approval" v={t?.waitingApproval} s={t ? (data.oldestWaiting ? `Oldest booked ${timeAgo(data.oldestWaiting)}` : "Nothing waiting") : ""} />
        <Stat loading={loading && !data} k={`Completed ${RANGE_TEXT[range]}`} v={t?.completedInRange} s={t ? `${t.completedAll} completed in total` : ""} />
        <Stat loading={loading && !data} k="Customers" v={t?.customers} s={t && t.newCustomers !== null ? `${t.newCustomers} joined ${RANGE_TEXT[range]}` : ""} />
      </section>

      <Panel title="Bay board" note="Live from service requests">
        {loading && !data ? <Skeleton h={150} /> : (
          <div className="board">
            {data?.board.map((lane) => (
              <div key={lane.key} className={`lane${lane.count === 0 ? " quiet" : ""}`}>
                <div className="lane-top"><span>{lane.label}</span><b className="num">{lane.count}</b></div>
                <div className="lane-meter" aria-hidden="true"><i style={{ width: `${t.inWorkshop ? Math.round((lane.count / t.inWorkshop) * 100) : 0}%` }} /></div>
                <div className="lane-list">
                  {lane.items.length === 0 && <div className="lane-empty">None right now.</div>}
                  {lane.items.map((it) => (
                    <div key={it.id} className="lane-item">
                      <Plate number={it.vehicle?.registration_number} type={it.vehicle?.vehicle_type} small />
                      <small>{[it.customer?.full_name, [it.vehicle?.brand, it.vehicle?.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}</small>
                    </div>
                  ))}
                  {lane.count > lane.items.length && <small className="board-hint">+{lane.count - lane.items.length} more</small>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="ui-cols">
        <Panel title="Recent requests" flush action={<Link to={`${base}/requests`} className="ui-btn ghost sm">View all</Link>}>
          <DataTable
            loading={loading && !data}
            rows={data?.recentRequests}
            noun="requests"
            empty={<EmptyState title="No service requests yet" text="New bookings from customers will show up here." />}
            columns={[
              { key: "no", label: "Request", main: true, render: (r) => <b className="num" style={{ fontSize: 15 }}>{r.request_number}</b> },
              { key: "cu", label: "Customer", render: (r) => r.customer?.full_name || "Unknown" },
              { key: "ve", label: "Vehicle", render: (r) => <Plate number={r.vehicle?.registration_number} type={r.vehicle?.vehicle_type} small /> },
              { key: "st", label: "Status", render: (r) => <StatusBadge status={r.request_status} /> },
              { key: "wh", label: "Booked", render: (r) => <span style={{ color: "var(--text-3)" }}>{timeAgo(r.created_at)}</span> },
            ]}
          />
        </Panel>

        <Panel title="Cars and bikes" note="All registered vehicles">
          {loading && !data ? <Skeleton h={80} /> : typeTotal === 0 ? (
            <EmptyState title="No vehicles registered" text="Vehicles appear here once customers add them." />
          ) : (
            <div className="mix">
              <div className="mix-bar" role="img" aria-label={data.vehiclesByType.map((x) => `${x.type} ${x.count}`).join(", ")}>
                {data.vehiclesByType.map((x, i) => <i key={x.type} style={{ width: `${(x.count / typeTotal) * 100}%`, background: TYPE_COLOURS[i] || "var(--ash)" }} />)}
              </div>
              <div className="mix-legend">
                {data.vehiclesByType.map((x, i) => (
                  <div key={x.type}><span style={{ "--dot": TYPE_COLOURS[i] || "var(--ash)" }} className="mix-key">{x.type}</span><b>{x.count}</b></div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Page>
  );
}

function Stat({ k, v, s, lead, loading }) {
  return (
    <div className={lead ? "lead" : undefined}>
      <div className="k">{k}</div>
      <div className="v">{loading ? <Skeleton w={70} h={34} style={{ marginTop: 2 }} /> : v ?? 0}</div>
      <div className="s">{loading ? <Skeleton w="60%" h={12} /> : s}</div>
    </div>
  );
}
