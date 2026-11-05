// The legacy keys ("token", "role", "user") are kept because several existing pages read them directly.
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

export const session = {
  getToken: () => safe(() => localStorage.getItem("token")),
  getUser: () => safe(() => JSON.parse(localStorage.getItem("user") || "null")),
  save(token, user) {
    safe(() => {
      localStorage.setItem("token", token);
      localStorage.setItem("role", String(user.role).toLowerCase());
      localStorage.setItem("user", JSON.stringify(user));
    });
  },
  saveUser(user) {
    safe(() => {
      localStorage.setItem("role", String(user.role).toLowerCase());
      localStorage.setItem("user", JSON.stringify(user));
    });
  },
  clear() {
    safe(() => ["token", "role", "user", "userId", "user_id", "technicianId"].forEach((k) => localStorage.removeItem(k)));
  },
};
