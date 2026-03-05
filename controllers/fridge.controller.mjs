import { supabase } from "../db/supabase.mjs";
import { resolveCategoryFromCatalogue } from "./catalogue.helpers.mjs";

// POST /api/fridge/items
// body: { name, quantityDelta?, expiryDate? }
export async function addFridgeItem(req, res) {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const delta = Number(req.body.quantityDelta ?? 1);
    const quantityDelta = Number.isFinite(delta) ? delta : 1;

    // expiryDate can be null or "YYYY-MM-DD"
    const expiryDateRaw = req.body.expiryDate ?? null;
    const expiryDate = expiryDateRaw ? String(expiryDateRaw) : null;

    // categorize via catalogue match (partial/fuzzy)
    const { CategoryID } = await resolveCategoryFromCatalogue(name, 22);

    // find existing inventory row by SAME user-entered name (case-insensitive)
    // If you want expiryDate to create separate rows, uncomment the .eq/.is logic below.
    let q = supabase
      .from("Ingredients")
      .select("IngredientID, name, quantity, CategoryID, expiryDate")
      .ilike("name", name)
      .limit(1);

    // Optional: treat same name but different expiryDate as different rows:
    // q = expiryDate ? q.eq("expiryDate", expiryDate) : q.is("expiryDate", null);

    const { data: existing, error: findErr } = await q;
    if (findErr) throw findErr;

    if (existing?.length) {
      const row = existing[0];
      const newQty = Number(row.quantity ?? 0) + quantityDelta;

      const { data: updated, error: updErr } = await supabase
        .from("Ingredients")
        .update({
          quantity: newQty,
          CategoryID: row.CategoryID ?? CategoryID, // keep existing if already set
          expiryDate: expiryDate ?? row.expiryDate, // only set if provided
        })
        .eq("IngredientID", row.IngredientID)
        .select("IngredientID, name, quantity, CategoryID, expiryDate")
        .single();

      if (updErr) throw updErr;
      return res.json({ ok: true, item: updated, created: false });
    }

    // create new row (store user-entered name)
    const { data: created, error: createErr } = await supabase
      .from("Ingredients")
      .insert([
        {
          name,
          quantity: quantityDelta,
          CategoryID,
          expiryDate,
        },
      ])
      .select("IngredientID, name, quantity, CategoryID, expiryDate")
      .single();

    if (createErr) throw createErr;

    res.status(201).json({ ok: true, item: created, created: true });
  } catch (err) {
    console.error("addFridgeItem error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
//getting fridge items/ingredients as theyre often referred to
export async function getFridgeItems(req, res) {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const search = req.query.search || null;

    let q = supabase
      .from("Ingredients")
      .select(`
        IngredientID,
        name,
        quantity,
        expiryDate,
        CategoryID,
        categories ( name )
      `)
      .gt("quantity", 0)
      .order("name", { ascending: true });

    if (categoryId) q = q.eq("CategoryID", categoryId);
    if (search) q = q.ilike("name", `%${search}%`);

    const { data, error } = await q;
    if (error) throw error;

    const items = (data ?? []).map(r => ({
      IngredientID: r.IngredientID,
      name: r.name,
      quantity: r.quantity,
      expiryDate: r.expiryDate ?? null,
      CategoryID: r.CategoryID,
      category: r.categories?.name ?? "Other / Uncategorized",
    }));

    res.json(items);
  } catch (err) {
    console.error("getFridgeItems error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
//getting the categories for the filtering -- instead of hardcoding them
export async function getCategories(_req, res) {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("CategoryID, name")
      .order("CategoryID", { ascending: true });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error("getCategories error:", err.message);
    res.status(500).json({ error: err.message });
  }
}