import { supabase } from "../db/supabase.mjs";
import { findOrCreateCatalogueItemByName } from "./catalogue.helpers.mjs";

async function getOrCreateCategoryId(categoryName) {
  const name = (categoryName || "Other / Uncategorized").trim();

  const { data: existing, error: findErr } = await supabase
    .from("categories")
    .select("CategoryID")
    .eq("name", name)
    .limit(1);

  if (findErr) throw findErr;
  if (existing?.length) return existing[0].CategoryID;

  const { data: created, error: createErr } = await supabase
    .from("categories")
    .insert([{ name }])
    .select("CategoryID")
    .single();

  if (createErr) throw createErr;
  return created.CategoryID;
}



export async function addFridgeItem(req, res) {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const quantityToAdd = Number(req.body.quantity ?? 1);

    const catItem = await findOrCreateCatalogueItemByName(name, 22);

    const { data: existingInv, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, quantity, CatalogueID")
      .eq("CatalogueID", catItem.CatalogueID)
      .limit(1);

    if (findErr) throw findErr;

    if (existingInv?.length) {
      const row = existingInv[0];
      const newQty = Number(row.quantity ?? 0) + (Number.isFinite(quantityToAdd) ? quantityToAdd : 1);

      const { data: updated, error: updateErr } = await supabase
        .from("Ingredients")
        .update({ quantity: newQty })
        .eq("IngredientID", row.IngredientID)
        .select("IngredientID, quantity, CatalogueID")
        .single();

      if (updateErr) throw updateErr;
      return res.status(200).json({ ok: true, item: updated, created: false });
    }

    const { data: created, error: createErr } = await supabase
      .from("Ingredients")
      .insert([{ CatalogueID: catItem.CatalogueID, quantity: quantityToAdd }])
      .select("IngredientID, quantity, CatalogueID")
      .single();

    if (createErr) throw createErr;

    res.status(201).json({ ok: true, item: created, created: true });
  } catch (err) {
    console.error("addFridgeItem error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/fridge/items?category=Fruits&search=ban
export async function getFridgeItems(req, res) {
  try {
    const category = req.query.category || null;
    const search = req.query.search || null;

    let query = supabase
      .from("Ingredients")
      .select(`
        IngredientID,
        quantity,
        CatalogueID,
        CatalogueTBL:CatalogueID (
          name,
          tags,
          CategoryID,
          categories ( name )
        )
      `)
      .gt("quantity", 0)
      .order("IngredientID", { ascending: false });

    if (search) {
      // search in catalogue name
      query = query.ilike("CatalogueTBL.name", `%${search}%`);
    }

    if (category) {
      query = query.eq("CatalogueTBL.categories.name", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data ?? []).map((r) => ({
      IngredientID: r.IngredientID,
      quantity: r.quantity,
      name: r.CatalogueTBL?.name ?? "Unknown",
      tags: r.CatalogueTBL?.tags ?? [],
      category: r.CatalogueTBL?.categories?.name ?? "Other / Uncategorized",
      CategoryID: r.CatalogueTBL?.CategoryID ?? 22,
      CatalogueID: r.CatalogueID
    }));

    res.json(items);
  } catch (err) {
    console.error("getFridgeItems error:", err.message);
    res.status(500).json({ error: err.message });
  }
}