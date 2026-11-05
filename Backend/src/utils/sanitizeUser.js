/** Removes every credential field before a user row leaves the server. */
export const sanitizeUser = (u) => {
  if (!u) return u;
  const { password, password_hash, password_migrated_at, ...safe } = u;
  return safe;
};
