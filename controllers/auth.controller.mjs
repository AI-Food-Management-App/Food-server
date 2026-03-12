import { supabase } from "../db/supabase.mjs";
import {
  validateRegisterBody,
  validateLoginBody
} from "../validators/auth.validators.mjs";

export async function register(req, res) {
  try {
    const { name, dob, email, password } = req.body;

    const errors = validateRegisterBody({ name, dob, email, password });
    if (errors) return res.status(400).json({ errors });

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim(), dob } }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{
          id: data.user.id,
          name: name.trim(),
          dob,
          email: email.trim().toLowerCase()
        }]);

      if (profileError) {
        console.error("Profile insert after register failed:", profileError.message);
      }
    }

    res.status(201).json({ ok: true, message: "Account created successfully" });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    const errors = validateLoginBody({ email, password });
    if (errors) return res.status(400).json({ errors });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    if (!data?.user || !data?.session?.access_token) {
      return res.status(401).json({ error: "Login failed: no session returned" });
    }

    res.json({
      ok: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? null
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
}