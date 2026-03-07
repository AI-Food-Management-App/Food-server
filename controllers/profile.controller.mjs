import { supabase } from "../db/supabase.mjs";
import { validateProfileUpdate } from "../validators/profile.validators.mjs";

// GET /api/profile
export async function getProfile(req, res) {
  try {
    console.log("getProfile called for user:", req.user.id); 

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, dob, email, allergies, created_at")
      .eq("id", req.user.id)
      .single();

    if (error) {
      console.error("Supabase getProfile error:", error.message, error.code); 
      throw error;
    }

    if (!data) return res.status(404).json({ error: "Profile not found" });

    res.json(data);
  } catch (err) {
    console.error("getProfile error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/profile
export async function updateProfile(req, res) {
  try {
    const { name, dob, allergies } = req.body;

    console.log("updateProfile called for user:", req.user.id); // debug
    console.log("Update payload:", { name, dob, allergies });   

    const errors = validateProfileUpdate({ name, dob, allergies });
    if (errors) return res.status(400).json({ errors });

    const updates = {};
    if (name      !== undefined) updates.name      = name.trim();
    if (dob       !== undefined) updates.dob       = dob;
    if (allergies !== undefined) updates.allergies = allergies;

    console.log("Sending to Supabase:", updates); 

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id)
      .select("id, name, dob, email, allergies, created_at");

    console.log("Supabase update result:", data, error?.message); 

    if (error) throw error;

    const updated = Array.isArray(data) ? data[0] : data;

    if (!updated) {
      return res.status(404).json({ error: "Profile not found or update blocked" });
    }

    res.json({ ok: true, profile: updated });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
// DELETE /api/profile
export async function deleteProfile(req, res) {
  try {
    // Delete from profiles table first
    const { error: profileErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", req.user.id);

    if (profileErr) throw profileErr;

    // Delete from Supabase Auth
    const { error: authErr } = await supabase.auth.admin.deleteUser(req.user.id);
    if (authErr) throw authErr;

    res.json({ ok: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("deleteProfile error:", err.message);
    res.status(500).json({ error: err.message });
  }
}