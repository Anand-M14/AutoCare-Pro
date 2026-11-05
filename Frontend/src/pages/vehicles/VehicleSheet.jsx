import { useState } from "react";
import { toast } from "react-toastify";
import { Button, Field, Input, Segmented, Select, Sheet } from "../../components/ui";
import useAsync from "../../hooks/useAsync";
import useAuth from "../../hook/useAuth";
import { createVehicle, listUsers, updateVehicle } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { isBike } from "../../lib/format";

const CAR_BRANDS = ["Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota", "Kia", "Renault", "Volkswagen", "Skoda", "Ford", "MG", "Nissan", "BMW", "Mercedes-Benz", "Audi"];
const BIKE_BRANDS = ["Hero", "Honda", "Bajaj", "TVS", "Royal Enfield", "Yamaha", "Suzuki", "KTM", "Kawasaki", "Ola Electric", "Ather", "Jawa"];
const PLATE_HINT = /^[A-Za-z0-9 -]{4,20}$/;

/** Add or edit one vehicle. Brand suggestions follow the Car / Bike switch. */
export default function VehicleSheet({ vehicle, onClose, onSaved }) {
  const { user } = useAuth();
  const staff = user.role !== "Customer";
  const editing = Boolean(vehicle);
  const [f, setF] = useState({
    vehicle_type: vehicle ? (isBike(vehicle.vehicle_type) ? "Bike" : "Car") : "Car",
    registration_number: vehicle?.registration_number || "", brand: vehicle?.brand || "", model: vehicle?.model || "",
    color: vehicle?.color || "", chassis_number: vehicle?.chassis_number || "", engine_number: vehicle?.engine_number || "",
    customer_id: vehicle?.customer_id || "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: customers } = useAsync(() => (staff && !editing ? listUsers({ page: 1, limit: 100, group: "customers", sort: "full_name", dir: "asc" }) : Promise.resolve(null)), [staff, editing]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const brands = f.vehicle_type === "Bike" ? BIKE_BRANDS : CAR_BRANDS;

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    const n = {};
    if (!PLATE_HINT.test(f.registration_number.trim())) n.registration_number = "Enter the registration number, for example TN 09 AB 4521";
    if (f.brand.trim().length < 2) n.brand = "Enter the brand";
    if (!f.model.trim()) n.model = "Enter the model";
    if (f.chassis_number && f.chassis_number.trim().length < 5) n.chassis_number = "At least 5 characters";
    if (f.engine_number && f.engine_number.trim().length < 3) n.engine_number = "At least 3 characters";
    if (staff && !editing && !f.customer_id) n.customer_id = "Choose the owner";
    setErrors(n); setFormError("");
    if (Object.keys(n).length) return;
    const body = { vehicle_type: f.vehicle_type, registration_number: f.registration_number.trim(), brand: f.brand.trim(), model: f.model.trim() };
    for (const k of ["color", "chassis_number", "engine_number"]) if (f[k].trim()) body[k] = f[k].trim();
    if (staff && !editing) body.customer_id = f.customer_id;
    setBusy(true);
    try {
      const saved = editing ? await updateVehicle(vehicle.id, body) : await createVehicle(body);
      toast.success(editing ? "Vehicle updated" : "Vehicle added");
      onSaved(saved);
    } catch (err) {
      const fields = err?.response?.data?.errors;
      if (fields && typeof fields === "object") setErrors(fields);
      setFormError(errorMessage(err, "We could not save this vehicle."));
      setBusy(false);
    }
  };

  return (
    <Sheet title={editing ? "Edit vehicle" : "Add a vehicle"} description={editing ? f.registration_number : "Cars and bikes are both supported."} onClose={onClose} busy={busy}
      footer={<><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" loading={busy} onClick={submit}>{editing ? "Save changes" : "Add vehicle"}</Button></>}>
      <form onSubmit={submit} noValidate className="auth-form">
        {formError && <div className="ui-alert" role="alert">{formError}</div>}
        <Segmented label="Vehicle type" value={f.vehicle_type} onChange={(v) => setF((s) => ({ ...s, vehicle_type: v, brand: "" }))} options={[{ value: "Car", label: "Car", icon: "car" }, { value: "Bike", label: "Bike", icon: "bike" }]} />
        {staff && !editing && (
          <Field label="Owner" error={errors.customer_id}>{(p) => (
            <Select {...p} value={f.customer_id} onChange={set("customer_id")}>
              <option value="">Choose a customer</option>
              {(customers?.rows || []).map((c) => <option key={c.id} value={c.id}>{c.full_name} · {c.phone}</option>)}
            </Select>)}
          </Field>
        )}
        <Field label="Registration number" error={errors.registration_number}>{(p) => <Input {...p} value={f.registration_number} onChange={set("registration_number")} placeholder="TN 09 AB 4521" autoCapitalize="characters" autoFocus />}</Field>
        <div className="ui-grid2">
          <Field label="Brand" error={errors.brand}>{(p) => (<><Input {...p} list="brand-list" value={f.brand} onChange={set("brand")} /><datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist></>)}</Field>
          <Field label="Model" error={errors.model}>{(p) => <Input {...p} value={f.model} onChange={set("model")} placeholder={f.vehicle_type === "Bike" ? "Classic 350" : "Swift VXi"} />}</Field>
        </div>
        <Field label="Colour (optional)" error={errors.color}>{(p) => <Input {...p} value={f.color} onChange={set("color")} />}</Field>
        <div className="ui-grid2">
          <Field label="Chassis number (optional)" error={errors.chassis_number}>{(p) => <Input {...p} value={f.chassis_number} onChange={set("chassis_number")} />}</Field>
          <Field label="Engine number (optional)" error={errors.engine_number}>{(p) => <Input {...p} value={f.engine_number} onChange={set("engine_number")} />}</Field>
        </div>
      </form>
    </Sheet>
  );
}
