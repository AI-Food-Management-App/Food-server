import { validateProfileUpdate } from "../validators/profile.validators.mjs";
import { getSupabaseUserClient } from "../db/supabaseUser.mjs";

// GET /api/profile
export async function getProfile(req, res) {
  try {
    const supabase = getSupabaseUserClient(req.accessToken);

    console.log("getProfile called for user:", req.user.id);

    let { data, error } = await supabase
      .from("profiles")
      .select("id, name, dob, email, allergies, created_at")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error("Supabase getProfile error:", error.message, error.code);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: req.user.id,
          email: req.user.email ?? null,
          name: null,
          dob: null,
          allergies: [],
        })
        .select("id, name, dob, email, allergies, created_at")
        .single();

      if (insertError) {
        console.error("Profile auto-create error:", insertError.message, insertError.code);
        return res.status(500).json({ error: insertError.message });
      }

      data = inserted;
    }

    res.json(data);
  } catch (err) {
    console.error("getProfile error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// PUT /api/profile
export async function updateProfile(req, res) {
  try {
    const supabase = getSupabaseUserClient(req.accessToken);
    const { name, dob, allergies } = req.body;

    const errors = validateProfileUpdate({ name, dob, allergies });
    if (errors) return res.status(400).json({ errors });

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (dob !== undefined) updates.dob = dob;
    if (allergies !== undefined) updates.allergies = allergies;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", req.user.id)
      .select("id, name, dob, email, allergies, created_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Profile not found or update blocked" });

    res.json({ ok: true, profile: data });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/profile
export async function deleteProfile(req, res) {
  try {
    const supabase = getSupabaseUserClient(req.accessToken);

    const { error: profileErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", req.user.id);

    if (profileErr) throw profileErr;

    res.json({ ok: true, message: "Profile deleted successfully" });
  } catch (err) {
    console.error("deleteProfile error:", err.message);
    res.status(500).json({ error: err.message });
  }
}