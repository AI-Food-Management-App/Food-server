import { supabase } from "../db/supabase.mjs";

async function getOrCreateCategoryId(categoryName) {
  const name = (categoryName || "Other / Uncategorized").trim();

  const { data: existing, error: findErr } = await supabase
    .from("Categories")
    .select("CategoryID")
    .eq("name", name)
    .limit(1);

  if (findErr) throw findErr;
  if (existing?.length) return existing[0].CategoryID;

  const { data: created, error: createErr } = await supabase
    .from("Categories")
    .insert([{ name }])
    .select("CategoryID")
    .single();

  if (createErr) throw createErr;
  return created.CategoryID;
}

// POST /api/fridge/items
// body: { name, quantity?, category?, tags? }
export async function addFridgeItem(req, res) {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const quantityToAdd = Number(req.body.quantity ?? 1);
    const categoryName = String(req.body.category ?? "Other / Uncategorized");
    const tags = Array.isArray(req.body.tags) ? req.body.tags : [];

    const categoryID = await getOrCreateCategoryId(categoryName);

    // check existing ingredient (case-insensitive)
    const { data: existing, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, name, quantity, CategoryID, tags")
      .ilike("name", name)
      .limit(1);

    if (findErr) throw findErr;

    if (existing?.length) {
      const row = existing[0];
      const newQty = Number(row.quantity ?? 0) + (Number.isFinite(quantityToAdd) ? quantityToAdd : 1);

      const mergedTags = Array.from(new Set([...(row.tags ?? []), ...tags]));

      const { data: updated, error: updateErr } = await supabase
        .from("Ingredients")
        .update({ quantity: newQty, CategoryID: row.CategoryID ?? categoryID, tags: mergedTags })
        .eq("IngredientID", row.IngredientID)
        .select("IngredientID, name, quantity, CategoryID, tags")
        .single();

      if (updateErr) throw updateErr;
      return res.status(200).json({ ok: true, item: updated, created: false });
    }

    // create new ingredient
    const { data: created, error: createErr } = await supabase
      .from("Ingredients")
      .insert([{ name, quantity: quantityToAdd, CategoryID: categoryID, tags }])
      .select("IngredientID, name, quantity, CategoryID, tags")
      .single();

    if (createErr) throw createErr;

    res.status(201).json({ ok: true, item: created, created: true });
  } catch (err) {
    console.error("addFridgeItem error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/fridge/items
export async function getFridgeItems(_req, res) {
  try {
    const { data, error } = await supabase
      .from("Ingredients")
      .select(`
        IngredientID,
        name,
        quantity,
        tags,
        CategoryID,
        Categories ( name )
      `)
      .order("IngredientID", { ascending: false });

    if (error) throw error;

    const items = (data ?? []).map((r) => ({
      IngredientID: r.IngredientID,
      name: r.name,
      quantity: r.quantity,
      tags: r.tags ?? [],
      category: r.Categories?.name ?? "Other / Uncategorized",
      CategoryID: r.CategoryID ?? null
    }));

    res.json(items);
  } catch (err) {
    console.error("getFridgeItems error:", err.message);
    res.status(500).json({ error: err.message });
  }
}