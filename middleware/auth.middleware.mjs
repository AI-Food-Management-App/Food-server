import { supabase } from "../db/supabase.mjs";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    console.log("requireAuth hit — header present:", !!authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized — no token provided" });
    }

    const token = authHeader.split(" ")[1];
    req.accessToken = token;

    const { data, error } = await supabase.auth.getUser(token);

    console.log("Supabase getUser result:", data?.user?.id, error?.message);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error("requireAuth crashed:", err.message);
    return res.status(500).json({ error: "Auth check failed" });
  }
}