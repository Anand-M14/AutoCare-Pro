import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button, Field, Input } from "../../components/ui";
import { forgotPassword } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setError("Enter a valid email address"); return; }
    setError(""); setBusy(true);
    try { await forgotPassword(email.trim().toLowerCase()); setSent(true); }
    catch (err) { setError(errorMessage(err, "We could not send the email. Please try again.")); }
    finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Reset your password" intro="Enter your account email and we will send you a reset link." footer={<Link to="/login">Back to sign in</Link>}>
      {sent ? (
        <div className="ui-alert ok" role="status">If an account exists for {email.trim()}, a reset link is on its way. The link works for 30 minutes.</div>
      ) : (
        <form onSubmit={submit} noValidate className="auth-form">
          <Field label="Email" error={error}>{(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />}</Field>
          <Button type="submit" variant="primary" loading={busy} className="auth-submit">Send reset link</Button>
        </form>
      )}
    </AuthLayout>
  );
}
