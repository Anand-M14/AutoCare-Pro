import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Button, Field, Select, Sheet, Skeleton, StatusBadge, Plate, Textarea } from "../../components/ui";
import Timeline from "../../components/requests/Timeline";
import useAsync from "../../hooks/useAsync";
import useAuth from "../../hook/useAuth";
import { errorMessage } from "../../lib/api";
import { fmtDate, fmtDateTime } from "../../lib/format";
import { approveRequest, assignAdvisor, assignTechnician, getAdvisorOptions, getRequest, getTechnicianOptions, rejectRequest, verifyReport, approveReport } from "../../services/apiServices";
import { markReady, markHandedOver } from "./actions";

/** One request, its journey, and every action the signed-in role may take on it right now. */
export default function RequestSheet({ id, onClose, onChanged }) {
  const { user } = useAuth();
  const { data: r, loading, error, reload } = useAsync(() => getRequest(id), [id]);
  const [busy, setBusy] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [tech, setTech] = useState("");
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const role = user.role;
  const status = r?.request_status;
  const isManagerish = role === "Admin" || role === "Manager";
  const needAdvisors = isManagerish && status === "Pending";
  const needTechs = (role === "Service Advisor" || role === "Admin") && status === "Advisor Assigned";
  const { data: advisors } = useAsync(() => (needAdvisors ? getAdvisorOptions() : Promise.resolve([])), [needAdvisors]);
  const { data: techs } = useAsync(() => (needTechs ? getTechnicianOptions() : Promise.resolve([])), [needTechs]);

  const run = async (key, fn, ok) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); toast.success(ok); onChanged(); await reload(); setRejecting(false); }
    catch (err) { toast.error(errorMessage(err, "That did not work. Please try again.")); }
    finally { setBusy(""); }
  };

  const actions = useMemo(() => {
    if (!r) return null;
    const mine = (field) => String(r[field]) === String(user.id);
    const out = [];
    if (isManagerish && status === "Pending") out.push("decide");
    if ((role === "Service Advisor" && mine("advisor_id")) || role === "Admin") {
      if (status === "Advisor Assigned") out.push("technician");
      if (status === "Report Submitted") out.push("verify");
      if (status === "Manager Approved") out.push("ready");
      if (status === "Vehicle Ready") out.push("handover");
    }
    if ((role === "Manager" && mine("manager_id")) && status === "Advisor Verified") out.push("approve");
    return out;
  }, [r, role, user.id, status, isManagerish]);

  return (
    <Sheet title={r ? r.request_number : "Service request"} description={r ? `${r.service_type || "Service"} · booked ${fmtDateTime(r.created_at)}` : undefined} onClose={onClose} busy={Boolean(busy)}>
      {loading && !r && <><Skeleton h={22} w="60%" /><Skeleton h={120} /></>}
      {error && <div className="ui-alert" role="alert"><span>{error}</span><Button size="sm" onClick={reload}>Try again</Button></div>}
      {r && (
        <>
          <div className="rs-top"><StatusBadge status={status} /><Plate number={r.vehicle?.registration_number} type={r.vehicle?.vehicle_type} /></div>
          <dl className="ui-kv">
            <dt>Vehicle</dt><dd>{[r.vehicle?.brand, r.vehicle?.model].filter(Boolean).join(" ") || "Not available"}</dd>
            <dt>Customer</dt><dd>{r.customer?.full_name || "Not available"}{r.customer?.phone ? ` · ${r.customer.phone}` : ""}</dd>
            <dt>Preferred slot</dt><dd>{[fmtDate(r.preferred_date), r.preferred_time].filter(Boolean).join(" at ") || "Not set"}</dd>
            <dt>Problem described</dt><dd>{r.customer_problem || "Not provided"}</dd>
            {r.advisor?.full_name && <><dt>Service advisor</dt><dd>{r.advisor.full_name}</dd></>}
            {r.technician?.full_name && <><dt>Technician</dt><dd>{r.technician.full_name}</dd></>}
            {r.rejection_reason && <><dt>Rejection reason</dt><dd>{r.rejection_reason}</dd></>}
          </dl>
          <div><h3 className="ui-section-title">Progress</h3><Timeline status={status} /></div>

          {actions.includes("decide") && (
            <div className="rs-act">
              <h3 className="ui-section-title">Decide on this booking</h3>
              {!rejecting ? (
                <>
                  <Field label="Assign a service advisor">{(p) => (
                    <Select {...p} value={advisor} onChange={(e) => setAdvisor(e.target.value)}>
                      <option value="">Choose an advisor</option>
                      {(advisors || []).map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </Select>)}
                  </Field>
                  <div className="rs-btns">
                    <Button variant="primary" loading={busy === "approve"} disabled={!advisor} onClick={() => run("approve", () => approveRequest(r.id, advisor), "Booking approved")}>Approve</Button>
                    <Button variant="danger" onClick={() => setRejecting(true)}>Reject</Button>
                  </div>
                </>
              ) : (
                <>
                  <Field label="Reason shown to the customer" hint="At least 3 characters">{(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />}</Field>
                  <div className="rs-btns">
                    <Button variant="danger" loading={busy === "reject"} disabled={reason.trim().length < 3} onClick={() => run("reject", () => rejectRequest(r.id, reason.trim()), "Booking rejected")}>Confirm rejection</Button>
                    <Button onClick={() => setRejecting(false)}>Back</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {actions.includes("technician") && (
            <div className="rs-act">
              <h3 className="ui-section-title">Assign a technician</h3>
              <Field label="Technician">{(p) => (
                <Select {...p} value={tech} onChange={(e) => setTech(e.target.value)}>
                  <option value="">Choose a technician</option>
                  {(techs || []).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </Select>)}
              </Field>
              <div className="rs-btns"><Button variant="primary" loading={busy === "tech"} disabled={!tech} onClick={() => run("tech", () => assignTechnician(r.id, tech), "Technician assigned")}>Assign technician</Button></div>
            </div>
          )}

          {actions.includes("verify") && <ActionBlock title="Technician report is in" text="Read the report under Reports, then verify it here to send it for quality approval." label="Verify report" busy={busy === "verify"} onClick={() => run("verify", () => verifyReport(r.id, user.id), "Report verified")} />}
          {actions.includes("approve") && <ActionBlock title="Quality approval" text="The advisor verified the technician's report. Approve it so the vehicle can be handed back." label="Approve report" busy={busy === "approve"} onClick={() => run("approve", () => approveReport(r.id), "Report approved")} />}
          {actions.includes("ready") && <ActionBlock title="Vehicle is approved" text="Mark the vehicle ready. The customer gets an email to pick it up." label="Mark vehicle ready" busy={busy === "ready"} onClick={() => run("ready", () => markReady(r.id), "Vehicle marked ready")} />}
          {actions.includes("handover") && <ActionBlock title="Handover" text="Confirm once the customer has collected the vehicle." label="Confirm handover" busy={busy === "handover"} onClick={() => run("handover", () => markHandedOver(r.id), "Service completed")} />}
        </>
      )}
    </Sheet>
  );
}

function ActionBlock({ title, text, label, busy, onClick }) {
  return (
    <div className="rs-act">
      <h3 className="ui-section-title">{title}</h3>
      <p style={{ color: "var(--text-2)" }}>{text}</p>
      <div className="rs-btns"><Button variant="primary" loading={busy} onClick={onClick}>{label}</Button></div>
    </div>
  );
}
