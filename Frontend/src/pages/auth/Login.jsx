import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button, Field, Icon, Input } from "../../components/ui";
import useAuth from "../../hook/useAuth";
import { errorMessage } from "../../lib/api";
import { homeFor } from "../../lib/roles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { user, login, checking } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  if (!checking && user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const next = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "We could not sign you in. Please try again."));
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      intro="Sign in to manage your vehicles and service."
      footer={<>New to AutoCare Pro? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="auth-form">
        {formError && <div className="ui-alert" role="alert">{formError}</div>}
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => (
            <div className="auth-pw">
              <Input {...p} type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}><Icon name={show ? "eyeoff" : "eye"} /></button>
            </div>
          )}
        </Field>
        <div className="auth-row"><Link to="/forgot-password">Forgot password?</Link></div>
        <Button type="submit" variant="primary" loading={busy} className="auth-submit">Sign in</Button>
      </form>
    </AuthLayout>
  );
}
