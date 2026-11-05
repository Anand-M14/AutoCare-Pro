import { useState } from "react";
import { toast } from "react-toastify";
import { Button, EmptyState, Field, Page, PageHeader, Plate, Segmented, Sheet, Skeleton, StatusBadge, Textarea } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { completeJob, myJobs, myReport, startJob, submitReport } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";

const GROUPS = [
  { value: "active", label: "Active" },
  { value: "done", label: "Finished" },
];
const ACTIVE = ["Technician Assigned", "Service Started", "Service Completed"];

export default function Jobs() {
  const { data, loading, error, reload } = useAsync(myJobs, []);
  const [group, setGroup] = useState("active");
  const [busy, setBusy] = useState("");
  const [reporting, setReporting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const jobs = (data || []).filter((j) => (group === "active" ? ACTIVE.includes(j.request_status) : !ACTIVE.includes(j.request_status)));

  const step = async (job, fn, ok) => {
    if (busy) return;
    setBusy(job.id);
    try { await fn(job.id); toast.success(ok); await reload(); }
    catch (err) { toast.error(errorMessage(err, "That did not work. Please try again.")); }
    finally { setBusy(""); }
  };

  return (
    <Page>
      <PageHeader title="My jobs" description="Start the work, finish it, then write the report for the advisor." actions={<Segmented label="Show" value={group} onChange={setGroup} options={GROUPS} />} />
      {error && <div className="ui-alert" role="alert"><span>{error}</span><Button size="sm" onClick={reload}>Try again</Button></div>}
      {loading && !data && <div className="jobs"><Skeleton h={190} style={{ borderRadius: 14 }} /><Skeleton h={190} style={{ borderRadius: 14 }} /></div>}
      {!loading && !error && jobs.length === 0 && <div className="ui-panel"><EmptyState title={group === "active" ? "No active jobs" : "No finished jobs yet"} text={group === "active" ? "New assignments from your advisor appear here." : undefined} /></div>}
      <div className="jobs">
        {jobs.map((j) => (
          <article key={j.id} className="job">
            <header><b className="num">{j.request_number}</b><StatusBadge status={j.request_status} /></header>
            <Plate number={j.vehicle?.registration_number} type={j.vehicle?.vehicle_type} />
            <h3>{[j.vehicle?.brand, j.vehicle?.model].filter(Boolean).join(" ") || "Vehicle"}</h3>
            <p className="job-problem">{j.customer_problem || "No description given."}</p>
            <dl className="job-meta"><div><dt>Service</dt><dd>{j.service_type || "Service"}</dd></div><div><dt>Customer</dt><dd>{j.customer?.full_name || "Unknown"}</dd></div><div><dt>Slot</dt><dd>{fmtDate(j.preferred_date)} {j.preferred_time || ""}</dd></div></dl>
            <footer>
              {j.request_status === "Technician Assigned" && <Button variant="primary" loading={busy === j.id} onClick={() => step(j, startJob, "Service started")}>Start service</Button>}
              {j.request_status === "Service Started" && <Button variant="primary" loading={busy === j.id} onClick={() => step(j, completeJob, "Service marked complete")}>Mark service complete</Button>}
              {j.request_status === "Service Completed" && <Button variant="primary" onClick={() => setReporting(j)}>Write report</Button>}
              {!ACTIVE.includes(j.request_status) && <Button onClick={() => setViewing(j)}>View report</Button>}
            </footer>
          </article>
        ))}
      </div>
      {reporting && <ReportSheet job={reporting} onClose={() => setReporting(null)} onDone={() => { setReporting(null); reload(); }} />}
      {viewing && <ViewReport job={viewing} onClose={() => setViewing(null)} />}
    </Page>
  );
}

function ReportSheet({ job, onClose, onDone }) {
  const [f, setF] = useState({ diagnosis: "", workDone: "", partsUsed: "", additionalNotes: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    if (busy) return;
    const n = {};
    if (f.diagnosis.trim().length < 3) n.diagnosis = "Describe what you found";
    if (f.workDone.trim().length < 3) n.workDone = "Describe the work you did";
    setErrors(n); setFormError("");
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await submitReport(job.id, { diagnosis: f.diagnosis.trim(), workDone: f.workDone.trim(), partsUsed: f.partsUsed.trim(), additionalNotes: f.additionalNotes.trim() });
      toast.success("Report sent to your advisor");
      onDone();
    } catch (err) { setFormError(errorMessage(err, "Could not send the report.")); setBusy(false); }
  };
  return (
    <Sheet title="Service report" description={`${job.request_number} · ${job.vehicle?.registration_number || ""}`} onClose={onClose} busy={busy}
      footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>Send report</Button></>}>
      {formError && <div className="ui-alert" role="alert">{formError}</div>}
      <Field label="Diagnosis" error={errors.diagnosis}>{(p) => <Textarea {...p} value={f.diagnosis} onChange={set("diagnosis")} />}</Field>
      <Field label="Work done" error={errors.workDone}>{(p) => <Textarea {...p} value={f.workDone} onChange={set("workDone")} />}</Field>
      <Field label="Parts used (optional)">{(p) => <Textarea {...p} value={f.partsUsed} onChange={set("partsUsed")} />}</Field>
      <Field label="Additional notes (optional)">{(p) => <Textarea {...p} value={f.additionalNotes} onChange={set("additionalNotes")} />}</Field>
    </Sheet>
  );
}

function ViewReport({ job, onClose }) {
  const { data, loading, error } = useAsync(() => myReport(job.id), [job.id]);
  return (
    <Sheet title="Service report" description={job.request_number} onClose={onClose}>
      {loading && <Skeleton h={120} />}
      {error && <div className="ui-alert" role="alert">{error}</div>}
      {!loading && !error && !data && <p style={{ color: "var(--text-2)" }}>No report was filed for this job.</p>}
      {data && <dl className="ui-kv"><dt>Diagnosis</dt><dd>{data.diagnosis || "-"}</dd><dt>Work done</dt><dd>{data.work_done || "-"}</dd><dt>Parts used</dt><dd>{data.parts_used || "-"}</dd><dt>Notes</dt><dd>{data.additional_notes || "-"}</dd></dl>}
    </Sheet>
  );
}
