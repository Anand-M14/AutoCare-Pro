import { useState } from "react";
import { toast } from "react-toastify";
import { Button, Field, Input, Select, Sheet } from "../../components/ui";
import { createUser, updateUser } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STAFF = ["Admin", "Manager", "Service Advisor", "Technician"];

const validate = (v, editing, isStaff) => {
  const e = {};
  if (v.full_name.trim().length < 2) e.full_name = "Enter the full name (at least 2 characters)";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address";
  if (!/^\+?[0-9]{7,15}$/.test(v.phone.replace(/[\s()-]/g, ""))) e.phone = "Enter a phone number with 7 to 15 digits";
  if (isStaff && !STAFF.includes(v.role)) e.role = "Choose a role";
  if (!editing || v.password) {
    if (v.password.length < 8 || !/[A-Za-z]/.test(v.password) || !/[0-9]/.test(v.password)) e.password = "Use at least 8 characters with a letter and a number";
  }
  return e;
};

/** Create or edit a customer / employee. `user` present = editing. */
export default function UserFormSheet({ user, mode, onClose, onSaved }) {
  const editing = Boolean(user);
  const isStaff = mode === "staff";
  const [v, setV] = useState({
    full_name: user?.full_name || "", email: user?.email || "", phone: user?.phone || "",
    role: user?.role || (isStaff ? "Service Advisor" : "Customer"), status: user?.status || "Active", password: "",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const noun = isStaff ? "employee" : "customer";

  const submit = async (ev) => {
    ev.preventDefault();
    if (busy) return; // no duplicate submissions
    const e = validate(v, editing, isStaff);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { full_name: v.full_name.trim(), email: v.email.trim(), phone: v.phone.trim(), role: v.role, status: v.status };
      if (v.password) body.password = v.password;
      if (editing) await updateUser(user.id, body); else await createUser(body);
      toast.success(editing ? `${v.full_name.trim()} updated` : `${v.full_name.trim()} added`);
      onSaved();
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors) setErrors(fieldErrors);
      toast.error(errorMessage(err, `Could not save the ${noun}.`));
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={editing ? `Edit ${noun}` : `Add ${noun}`}
      description={editing ? "Changes apply the next time they sign in or refresh." : `They can sign in with the email and password you set here.`}
      onClose={onClose}
      busy={busy}
      footer={<>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" type="submit" form="user-form" loading={busy}>{editing ? "Save changes" : `Add ${noun}`}</Button>
      </>}
    >
      <form id="user-form" onSubmit={submit} noValidate style={{ display: "contents" }}>
        <Field label="Full name" error={errors.full_name}>{(p) => <Input {...p} value={v.full_name} onChange={set("full_name")} autoComplete="off" />}</Field>
        <div className="ui-grid2">
          <Field label="Email" error={errors.email}>{(p) => <Input {...p} type="email" value={v.email} onChange={set("email")} autoComplete="off" />}</Field>
          <Field label="Phone" error={errors.phone}>{(p) => <Input {...p} type="tel" inputMode="tel" value={v.phone} onChange={set("phone")} />}</Field>
        </div>
        <div className="ui-grid2">
          {isStaff && (
            <Field label="Role" error={errors.role}>
              {(p) => <Select {...p} value={v.role} onChange={set("role")}>{STAFF.map((r) => <option key={r}>{r}</option>)}</Select>}
            </Field>
          )}
          <Field label="Account status" hint="Inactive accounts cannot sign in.">
            {(p) => <Select {...p} value={v.status} onChange={set("status")}><option>Active</option><option>Inactive</option></Select>}
          </Field>
        </div>
        <Field label={editing ? "New password" : "Password"} error={errors.password} hint={editing ? "Leave blank to keep the current password." : "At least 8 characters, with a letter and a number."}>
          {(p) => <Input {...p} type="password" value={v.password} onChange={set("password")} autoComplete="new-password" />}
        </Field>
      </form>
    </Sheet>
  );
}
