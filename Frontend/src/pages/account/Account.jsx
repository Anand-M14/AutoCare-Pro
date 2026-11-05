import { useState } from "react";
import { toast } from "react-toastify";
import { Avatar, Button, Field, Input, Page, PageHeader, Panel } from "../../components/ui";
import useAuth from "../../hook/useAuth";
import { changePassword, updateProfile } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { passwordIssue } from "../auth/Register";

export default function Account() {
  const { user } = useAuth();
  return (
    <Page>
      <PageHeader title="Profile and settings" description="Your details and sign-in security." />
      <div className="account">
        <aside className="account-card">
          <Avatar name={user.full_name || user.email} size={72} />
          <h2>{user.full_name}</h2>
          <span className="role">{user.role}</span>
          <dl><dt>Email</dt><dd>{user.email}</dd><dt>Phone</dt><dd>{user.phone || "Not set"}</dd></dl>
        </aside>
        <div className="account-forms"><ProfileForm /><PasswordForm /></div>
      </div>
    </Page>
  );
}

function ProfileForm() {
  const { user, updateUser } = useAuth();
  const [f, setF] = useState({ full_name: user.full_name || "", phone: user.phone || "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const dirty = f.full_name !== (user.full_name || "") || f.phone !== (user.phone || "");

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !dirty) return;
    const phone = f.phone.replace(/[\s()-]/g, "");
    const n = {};
    if (f.full_name.trim().length < 2) n.full_name = "Enter your full name";
    if (phone && !/^\+?\d{7,15}$/.test(phone)) n.phone = "Enter a valid phone number (7 to 15 digits)";
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      const body = { full_name: f.full_name.trim() };
      if (phone) body.phone = phone;
      const updated = await updateProfile(body);
      updateUser({ ...user, ...updated });
      toast.success("Profile updated");
      setBusy(false);
    } catch (err) {
      setErrors({ form: errorMessage(err, "Could not update your profile.") });
      setBusy(false);
    }
  };

  return (
    <Panel title="Your details">
      <form onSubmit={submit} noValidate className="auth-form">
        {errors.form && <div className="ui-alert" role="alert">{errors.form}</div>}
        <Field label="Full name" error={errors.full_name}>{(p) => <Input {...p} value={f.full_name} onChange={(e) => setF((s) => ({ ...s, full_name: e.target.value }))} />}</Field>
        <Field label="Phone" error={errors.phone}>{(p) => <Input {...p} type="tel" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} />}</Field>
        <Field label="Email" hint="Your email is your sign-in and cannot be changed here."><Input value={user.email} disabled readOnly /></Field>
        <div><Button type="submit" variant="primary" loading={busy} disabled={!dirty}>Save changes</Button></div>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const n = {};
    if (!f.current) n.current = "Enter your current password";
    const issue = passwordIssue(f.next);
    if (issue) n.next = issue;
    else if (f.next === f.current) n.next = "Choose a password you have not used";
    if (f.confirm !== f.next) n.confirm = "Passwords do not match";
    setErrors(n);
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await changePassword({ current_password: f.current, new_password: f.next });
      toast.success("Password changed");
      setF({ current: "", next: "", confirm: "" });
    } catch (err) { setErrors({ form: errorMessage(err, "Could not change your password.") }); }
    finally { setBusy(false); }
  };

  return (
    <Panel title="Change password">
      <form onSubmit={submit} noValidate className="auth-form">
        {errors.form && <div className="ui-alert" role="alert">{errors.form}</div>}
        <Field label="Current password" error={errors.current}>{(p) => <Input {...p} type="password" autoComplete="current-password" value={f.current} onChange={set("current")} />}</Field>
        <div className="ui-grid2">
          <Field label="New password" error={errors.next}>{(p) => <Input {...p} type="password" autoComplete="new-password" value={f.next} onChange={set("next")} />}</Field>
          <Field label="Confirm new password" error={errors.confirm}>{(p) => <Input {...p} type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} />}</Field>
        </div>
        <div><Button type="submit" variant="primary" loading={busy}>Update password</Button></div>
      </form>
    </Panel>
  );
}
