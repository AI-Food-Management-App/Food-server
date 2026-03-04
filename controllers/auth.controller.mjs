import { supabase } from "../db/supabase.mjs";

function isValidName(name) {
  // Only letters, spaces, hyphens, apostrophes — no special characters
  return /^[a-zA-Z\s'-]+$/.test(name.trim());
}

function calculateAge(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export async function register(req, res) {
  try {
    const { name, dob, email, password } = req.body;

    if (!name || !dob || !email || !password)
      return res.status(400).json({ error: "All fields are required" });

    if (!isValidName(name))
      return res.status(400).json({ error: "Name cannot contain special characters" });

    if (!email.includes("@"))
      return res.status(400).json({ error: "Email must contain @" });

    if (calculateAge(dob) < 16)
      return res.status(400).json({ error: "You must be at least 16 years old to register" });

    if (password.length < 8)
      return res.status(400).json({ error: "Password must be at least 8 characters" });

    // Supabase Auth creates the user and hashes the password
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, dob } } 
    });

    if (error) throw error;

    
    if (data.user) {
      await supabase.from("profiles").insert([{
        id: data.user.id, 
        name: name.trim(),
        dob,
        email
      }]);
    }

    res.status(201).json({ ok: true, message: "Account created successfully" });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Always return a generic message so attackers can't guess which field is wrong
    if (error) return res.status(401).json({ error: "Invalid email or password" });

    res.json({
      ok: true,
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name
      }
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: err.message });
  }
}