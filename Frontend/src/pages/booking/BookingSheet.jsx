import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Button, EmptyState, Field, Input, Plate, Segmented, Select, Sheet, Skeleton, Textarea } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import { createBooking, listVehicles } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { isBike } from "../../lib/format";

const CAR_SERVICES = ["General service", "Oil and filter change", "Brake service", "AC service", "Wheel alignment and balancing", "Battery check", "Engine diagnostics", "Body and paint work", "Other"];
const BIKE_SERVICES = ["General service", "Oil change", "Chain and sprocket service", "Brake service", "Battery check", "Engine diagnostics", "Tyre change", "Other"];
const today = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10); // India date
const SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

/** Booking for a customer: pick a vehicle, a service, a day and a slot. */
export default function BookingSheet({ onClose, onBooked, vehicleId = "" }) {
  const { data, loading, error, reload } = useAsync(() => listVehicles({ limit: 100 }), []);
  const vehicles = data?.rows || [];
  const [f, setF] = useState({ vehicle_id: vehicleId, service_type: "", preferred_date: "", preferred_time: "", customer_problem: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const chosen = vehicles.find((v) => v.id === f.vehicle_id);
  const services = chosen && isBike(chosen.vehicle_type) ? BIKE_SERVICES : CAR_SERVICES;
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const n = {};
    if (!f.vehicle_id) n.vehicle_id = "Choose a vehicle";
    if (!f.service_type) n.service_type = "Choose a service";
    if (!f.preferred_date) n.preferred_date = "Choose a date";
    else if (f.preferred_date < today()) n.preferred_date = "Choose today or a later date";
    if (!f.preferred_time) n.preferred_time = "Choose a time";
    if (f.customer_problem.trim().length < 5) n.customer_problem = "Tell us briefly what needs attention (at least 5 characters)";
    setErrors(n); setFormError("");
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await createBooking({ ...f, customer_problem: f.customer_problem.trim() });
      toast.success("Booking sent. You will get an email once it is approved.");
      onBooked();
    } catch (err) {
      setFormError(errorMessage(err, "We could not send your booking."));
      setBusy(false);
    }
  };

  return (
    <Sheet title="Book a service" description="We will confirm by email once a manager approves it." onClose={onClose} busy={busy}
      footer={vehicles.length > 0 && <><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>Send booking</Button></>}>
      {loading && <><Skeleton h={42} /><Skeleton h={42} /><Skeleton h={90} /></>}
      {error && <div className="ui-alert" role="alert"><span>{error}</span><Button size="sm" onClick={reload}>Try again</Button></div>}
      {!loading && !error && vehicles.length === 0 && (
        <EmptyState title="Add a vehicle first" text="Your car or bike needs to be in your garage before you can book." action={<Link to="/customer/vehicles" className="ui-btn primary" onClick={onClose}>Add a vehicle</Link>} />
      )}
      {!loading && vehicles.length > 0 && (
        <form onSubmit={submit} noValidate className="auth-form">
          {formError && <div className="ui-alert" role="alert">{formError}</div>}
          <Field label="Vehicle" error={errors.vehicle_id}>{(p) => (
            <Select {...p} value={f.vehicle_id} onChange={(e) => { set("vehicle_id", e.target.value); set("service_type", ""); }}>
              <option value="">Choose a vehicle</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} · {v.brand} {v.model}</option>)}
            </Select>)}
          </Field>
          {chosen && <Plate number={chosen.registration_number} type={chosen.vehicle_type} />}
          <Field label="Service" error={errors.service_type}>{(p) => (
            <Select {...p} value={f.service_type} onChange={(e) => set("service_type", e.target.value)} disabled={!f.vehicle_id}>
              <option value="">{f.vehicle_id ? "Choose a service" : "Choose a vehicle first"}</option>
              {services.map((s) => <option key={s}>{s}</option>)}
            </Select>)}
          </Field>
          <div className="ui-grid2">
            <Field label="Preferred date" error={errors.preferred_date}>{(p) => <Input {...p} type="date" min={today()} value={f.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />}</Field>
            <Field label="Preferred time" error={errors.preferred_time}>{(p) => (
              <Select {...p} value={f.preferred_time} onChange={(e) => set("preferred_time", e.target.value)}>
                <option value="">Choose a time</option>{SLOTS.map((s) => <option key={s}>{s}</option>)}
              </Select>)}
            </Field>
          </div>
          <Field label="What needs attention?" error={errors.customer_problem}>{(p) => <Textarea {...p} maxLength={500} value={f.customer_problem} onChange={(e) => set("customer_problem", e.target.value)} placeholder="For example: brakes feel soft, strange noise from the engine" />}</Field>
        </form>
      )}
    </Sheet>
  );
}
