import supabase from "../../config/supabase.js";

const escapeLike = (s) => s.replace(/[\\%_]/g, "\\$&");

/** Default (Supabase) user store. Tests can replace it via app.locals.userStore. */
export const supabaseUserStore = {
  async findByEmail(email) {
    const { data, error } = await supabase
      .from("users").select("*").ilike("email", escapeLike(email)).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },
  async findById(id) {
    const { data, error } = await supabase
      .from("users").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async createCustomer(row) {
    const { data, error } = await supabase.from("users").insert([row]).select().single();
    if (error) throw error;
    return data;
  },
  async findByResetHash(hash) {
    const { data, error } = await supabase.from("users").select("*").eq("password_reset_token_hash", hash).maybeSingle();
    if (error) throw error;
    return data;
  },
  async update(id, patch) {
    const { data, error } = await supabase.from("users").update(patch).eq("id", id).select().maybeSingle();
    if (error) throw error;
    return data;
  },
  async setPasswordHash(id, hash) {
    const { error } = await supabase
      .from("users").update({ password_hash: hash }).eq("id", id);
    if (error) throw error;
  },
};

export const getUserStore = (req) => req.app.locals.userStore || supabaseUserStore;
