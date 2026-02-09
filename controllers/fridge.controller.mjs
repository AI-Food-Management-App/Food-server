import { supabase } from "../db/supabase.mjs";

/**
 * POST /api/fridge/items
 * body: { userID, name }
 */
export async function addFridgeItem(req, res) {
  try {
    const userID = Number(req.body.userID ?? 1); // until auth exists
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    // Prevent duplicates per user (case-insensitive)
    const { data: existing, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, name")
      .eq("userID", userID)
      .ilike("name", name)
      .limit(1);

    if (findErr) throw findErr;

    if (existing?.length) {
      return res.status(200).json({ ok: true, item: existing[0], created: false });
    }

    const { data: created, error: createErr } = await supabase
      .from("Ingredients")
      .insert([{ userID, name }])
      .select("IngredientID, name")
      .single();

    if (createErr) throw createErr;

    res.status(201).json({ ok: true, item: created, created: true });
  } catch (err) {
    console.error("addFridgeItem error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/fridge/items?userID=1
 */
export async function getFridgeItems(req, res) {
  try {
    const userID = Number(req.query.userID ?? 1);
    const { data, error } = await supabase
      .from("Ingredients")
      .select("IngredientID, name")
      .eq("userID", userID)
      .order("IngredientID", { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error("getFridgeItems error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
