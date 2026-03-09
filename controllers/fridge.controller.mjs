import { supabase } from "../db/supabase.mjs";
//import { getSupabaseUserClient } from "../db/supabaseUser.mjs";
import { resolveCategoryFromCatalogue } from "./catalogue.helpers.mjs";

// POST /api/fridge/items
// body: { name, quantityDelta?, expiryDate? }
export async function addFridgeItem(req, res) {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const delta = Number(req.body.quantityDelta ?? 1);
    const quantityDelta = Number.isFinite(delta) ? delta : 1;

    const expiryDateRaw = req.body.expiryDate ?? null;
    const expiryDate = expiryDateRaw ? String(expiryDateRaw) : null;

    const manualCategoryId = req.body.CategoryID ? Number(req.body.CategoryID) : null;
    const description = req.body.description ? String(req.body.description).trim() : null;
    const tags = Array.isArray(req.body.tags)
      ? req.body.tags.map(t => String(t).trim()).filter(Boolean)
      : [];

    const resolved = await resolveCategoryFromCatalogue(name, 22);
    const resolvedCategoryId = resolved?.CategoryID ?? 22;
    const finalCategoryId = manualCategoryId || resolvedCategoryId;

    let q = supabase
      .from("Ingredients")
      .select("IngredientID, name, quantity, CategoryID, expiryDate, description, tags")
      .ilike("name", name)
      .limit(1);

    const { data: existing, error: findErr } = await q;
    if (findErr) throw findErr;

    if (existing?.length) {
      const row = existing[0];
      const newQty = Number(row.quantity ?? 0) + quantityDelta;

      const { data: updated, error: updErr } = await supabase
        .from("Ingredients")
        .update({
          quantity: newQty,
          CategoryID: finalCategoryId ?? row.CategoryID,
          expiryDate: expiryDate ?? row.expiryDate,
          description: description ?? row.description ?? null,
          tags: tags.length ? tags : row.tags ?? []
        })
        .eq("IngredientID", row.IngredientID)
        .select("IngredientID, name, quantity, CategoryID, expiryDate, description, tags")
        .single();

      if (updErr) throw updErr;
      return res.json({ ok: true, item: updated, created: false });
    }

    const { data: created, error: createErr } = await supabase
      .from("Ingredients")
      .insert([
        {
          name,
          quantity: quantityDelta,
          CategoryID: finalCategoryId,
          expiryDate,
          description,
          tags
        }
      ])
      .select("IngredientID, name, quantity, CategoryID, expiryDate, description, tags")
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
    console.log("getFridgeItems hit");
    console.log("raw query:", req.query);

    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const search = req.query.search || null;

    //added for tag filtering, not currently used but will be in the future
    const tag = req.query.tag || null;
    if (tag) q = q.contains("tags", [tag]);

    let q = supabase
    .from("Ingredients")
    .select(`
      IngredientID,
      name,
      quantity,
      expiryDate,
      CategoryID,
      description,
      tags,
      categories ( name )
    `)
    .gt("quantity", 0)
    .order("name", { ascending: true });

    if (categoryId) q = q.eq("CategoryID", categoryId);
    if (search) q = q.ilike("name", `%${search}%`);

    const { data, error } = await q;

    console.log("getFridgeItems supabase error:", error);
    console.log("getFridgeItems rows:", data?.length ?? 0);

    if (error) throw error;

    const items = (data ?? []).map(r => ({
    IngredientID: r.IngredientID,
    name: r.name,
    quantity: r.quantity,
    expiryDate: r.expiryDate ?? null,
    CategoryID: r.CategoryID,
    category: r.categories?.name ?? "Other / Uncategorized",
    description: r.description ?? null,
    tags: r.tags ?? []
  }));

    res.json(items);
  } catch (err) {
    console.error("getFridgeItems error full:", err);
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
//updating the items 
export async function updateFridgeItem(req, res) {
  try {
    const itemId = Number(req.params.itemId);
    if (!Number.isFinite(itemId)) {
      return res.status(400).json({ error: "Invalid itemId" });
    }

    const updates = {};

    if (req.body.CategoryID !== undefined) {
      updates.CategoryID = Number(req.body.CategoryID);
    }

    if (req.body.quantity !== undefined) {
      updates.quantity = Number(req.body.quantity);
    }

    if (req.body.expiryDate !== undefined) {
      updates.expiryDate = req.body.expiryDate || null;
    }

    if (req.body.description !== undefined) {
      updates.description = req.body.description ? String(req.body.description).trim() : null;
    }

    if (req.body.tags !== undefined) {
      updates.tags = Array.isArray(req.body.tags)
        ? req.body.tags.map(t => String(t).trim()).filter(Boolean)
        : [];
    }

    const { data, error } = await supabase
      .from("Ingredients")
      .update(updates)
      .eq("IngredientID", itemId)
      .select(`
        IngredientID,
        name,
        quantity,
        expiryDate,
        CategoryID,
        description,
        tags,
        categories ( name )
      `)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("updateFridgeItem error:", err.message);
    res.status(500).json({ error: err.message });
  }
}