import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import AuthLayout from "./AuthLayout";
import { Button, Field, Input } from "../../components/ui";
import { resetPassword } from "../../services/apiServices";
import { errorMessage } from "../../lib/api";
import { passwordIssue } from "./Register";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const n = {};
    const issue = passwordIssue(pw);
    if (issue) n.pw = issue;
    if (confirm !== pw) n.confirm = "Passwords do not match";
    setErrors(n); setFormError("");
    if (Object.keys(n).length) return;
    setBusy(true);
    try {
      await resetPassword(token, pw);
      toast.success("Password updated. Please sign in.");
      navigate("/login", { replace: true });
    } catch (err) {
      setFormError(errorMessage(err, "This reset link is invalid or has expired."));
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password" footer={<Link to="/login">Back to sign in</Link>}>
      {!token ? (
        <div className="ui-alert" role="alert">This link is missing its token. <Link to="/forgot-password">Request a new link</Link></div>
      ) : (
        <form onSubmit={submit} noValidate className="auth-form">
          {formError && <div className="ui-alert" role="alert">{formError} <Link to="/forgot-password">Request a new link</Link></div>}
          <Field label="New password" error={errors.pw} hint="At least 8 characters, with a letter and a number">{(p) => <Input {...p} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />}</Field>
          <Field label="Confirm password" error={errors.confirm}>{(p) => <Input {...p} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
          <Button type="submit" variant="primary" loading={busy} className="auth-submit">Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
}
