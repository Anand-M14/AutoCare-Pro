import { useState } from "react";
import { toast } from "react-toastify";
import { Button, EmptyState, Page, PageHeader, Plate, Segmented, Skeleton, StatusBadge } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import useAuth from "../../hook/useAuth";
import { advisorReports, approveReport, managerReports, verifyReport } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { fmtDateTime } from "../../lib/format";

/** Technician reports waiting on the signed-in role, plus the ones already handled. */
export default function Reports() {
  const { user } = useAuth();
  const isManager = user.role === "Manager";
  const needs = isManager ? "Advisor Verified" : "Report Submitted";
  const { data, loading, error, reload } = useAsync(() => (isManager ? managerReports() : advisorReports(user.id)), [isManager, user.id]);
  const [tab, setTab] = useState("todo");
  const [busy, setBusy] = useState("");

  const all = (data || []).filter((r) => r.report || r.request_status !== "Pending");
  const rows = all.filter((r) => (tab === "todo" ? r.request_status === needs : r.request_status !== needs));
  const todoCount = all.filter((r) => r.request_status === needs).length;

  const act = async (r) => {
    if (busy) return;
    setBusy(r.id);
    try {
      if (isManager) await approveReport(r.id); else await verifyReport(r.id, user.id);
      toast.success(isManager ? "Report approved" : "Report verified");
      await reload();
    } catch (err) { toast.error(errorMessage(err, "That did not work. Please try again.")); }
    finally { setBusy(""); }
  };

  return (
    <Page>
      <PageHeader
        title="Technician reports"
        description={isManager ? "Approve verified reports so vehicles can be handed back." : "Read each report, then verify it for quality approval."}
        actions={<Segmented label="Show" value={tab} onChange={setTab} options={[{ value: "todo", label: `Needs action${todoCount ? ` (${todoCount})` : ""}` }, { value: "done", label: "Handled" }]} />}
      />
      {error && <div className="ui-alert" role="alert"><span>{error}</span><Button size="sm" onClick={reload}>Try again</Button></div>}
      {loading && !data && <div className="reports"><Skeleton h={200} style={{ borderRadius: 14 }} /></div>}
      {!loading && !error && rows.length === 0 && <div className="ui-panel"><EmptyState title={tab === "todo" ? "Nothing waiting for you" : "No handled reports yet"} text={tab === "todo" ? "New reports appear here as technicians submit them." : undefined} /></div>}
      <div className="reports">
        {rows.map((r) => (
          <article key={r.id} className="report">
            <header>
              <div><b className="num">{r.request_number}</b><small>{r.technician?.full_name ? `by ${r.technician.full_name}` : ""}{r.report?.created_at ? ` · ${fmtDateTime(r.report.created_at)}` : ""}</small></div>
              <StatusBadge status={r.request_status} />
            </header>
            <div className="report-veh"><Plate number={r.vehicle?.registration_number} type={r.vehicle?.vehicle_type} small /><span>{[r.vehicle?.brand, r.vehicle?.model].filter(Boolean).join(" ")}</span>{r.customer?.full_name && <span>· {r.customer.full_name}</span>}</div>
            {r.report ? (
              <dl className="ui-kv">
                <dt>Diagnosis</dt><dd>{r.report.diagnosis || "-"}</dd>
                <dt>Work done</dt><dd>{r.report.work_done || "-"}</dd>
                <dt>Parts used</dt><dd>{r.report.parts_used || "-"}</dd>
                <dt>Notes</dt><dd>{r.report.additional_notes || "-"}</dd>
              </dl>
            ) : <p style={{ color: "var(--text-3)" }}>No report details were recorded.</p>}
            {r.request_status === needs && <footer><Button variant="primary" loading={busy === r.id} onClick={() => act(r)}>{isManager ? "Approve report" : "Verify report"}</Button></footer>}
          </article>
        ))}
      </div>
    </Page>
  );
}
