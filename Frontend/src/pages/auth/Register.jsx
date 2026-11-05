import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "./AuthLayout";
import { Button, Field, Icon, Input } from "../../components/ui";
import useAuth from "../../hook/useAuth";
import { registerCustomer } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { homeFor } from "../../lib/roles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const passwordIssue = (p) =>
  p.length < 8 ? "Use at least 8 characters" : !/[A-Za-z]/.test(p) || !/\d/.test(p) ? "Include at least one letter and one number" : "";

export default function Register() {
  const { user, login, checking } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!checking && user) return <Navigate to={homeFor(user.role)} replace />;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const phone = f.phone.replace(/[\s()-]/g, "");
    const n = {};
    if (f.full_name.trim().length < 2) n.full_name = "Enter your full name";
    if (!EMAIL_RE.test(f.email.trim())) n.email = "Enter a valid email address";
    if (!/^\+?\d{7,15}$/.test(phone)) n.phone = "Enter a valid phone number (7 to 15 digits)";
    const pw = passwordIssue(f.password);
    if (pw) n.password = pw;
    if (f.confirm !== f.password) n.confirm = "Passwords do not match";
    setErrors(n); setFormError("");
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await registerCustomer({ full_name: f.full_name.trim(), email: f.email.trim().toLowerCase(), phone, password: f.password });
      toast.success("Account created");
      const u = await login(f.email.trim().toLowerCase(), f.password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "We could not create your account."));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your account" intro="Add your cars and bikes, then book a service in minutes." footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="auth-form">
        {formError && <div className="ui-alert" role="alert">{formError}</div>}
        <Field label="Full name" error={errors.full_name}>{(p) => <Input {...p} autoComplete="name" value={f.full_name} onChange={set("full_name")} autoFocus />}</Field>
        <div className="ui-grid2">
          <Field label="Email" error={errors.email}>{(p) => <Input {...p} type="email" autoComplete="email" value={f.email} onChange={set("email")} />}</Field>
          <Field label="Mobile number" error={errors.phone}>{(p) => <Input {...p} type="tel" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="9876543210" />}</Field>
        </div>
        <Field label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number">
          {(p) => (
            <div className="auth-pw">
              <Input {...p} type={show ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={set("password")} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}><Icon name={show ? "eyeoff" : "eye"} /></button>
            </div>
          )}
        </Field>
        <Field label="Confirm password" error={errors.confirm}>{(p) => <Input {...p} type={show ? "text" : "password"} autoComplete="new-password" value={f.confirm} onChange={set("confirm")} />}</Field>
        <Button type="submit" variant="primary" loading={busy} className="auth-submit">Create account</Button>
      </form>
    </AuthLayout>
  );
}
