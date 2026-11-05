import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { session } from "../lib/session";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (session.getToken() ? session.getUser() : null));
  // "checking" while we confirm a stored token with the server
  const [checking, setChecking] = useState(() => Boolean(session.getToken()));

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
  }, []);

  // Validate the stored token once on load; the server is the source of truth for role/status.
  useEffect(() => {
    if (!session.getToken()) { setChecking(false); return; }
    let alive = true;
    api.get("/auth/me")
      .then((res) => { if (alive) { session.saveUser(res.data.data); setUser(res.data.data); } })
      .catch((err) => { if (alive && err.response?.status === 401) logout(); })
      .finally(() => alive && setChecking(false));
    return () => { alive = false; };
  }, [logout]);

  useEffect(() => {
    window.addEventListener("auth:expired", logout);
    return () => window.removeEventListener("auth:expired", logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    session.save(res.data.token, res.data.user);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const updateUser = useCallback((next) => { session.saveUser(next); setUser(next); }, []);

  const value = useMemo(() => ({ user, checking, isAuthenticated: Boolean(user), login, logout, updateUser }), [user, checking, login, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
