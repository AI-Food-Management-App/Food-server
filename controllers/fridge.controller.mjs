import { supabase } from "../db/supabase.mjs";
import { findOrCreateCatalogueItemByName } from "./catalogue.helpers.mjs";

// POST /api/fridge/items
export async function addFridgeItem(req, res) {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });

    const quantityToAdd = Number(req.body.quantity ?? 1);
    const qty = Number.isFinite(quantityToAdd) ? quantityToAdd : 1;

    // 1) Ensure in CatalogueTBL (infer category / default 22)
    const catItem = await findOrCreateCatalogueItemByName(name, 22);

    // 2) Update Ingredients inventory by CatalogueID
    const { data: existingInv, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, quantity, CatalogueID")
      .eq("CatalogueID", catItem.CatalogueID)
      .limit(1);

    if (findErr) throw findErr;

    if (existingInv?.length) {
      const row = existingInv[0];
      const newQty = Number(row.quantity ?? 0) + qty;

      const { data: updated, error: updateErr } = await supabase
        .from("Ingredients")
        .update({ quantity: newQty })
        .eq("IngredientID", row.IngredientID)
        .select("IngredientID, quantity, CatalogueID")
        .single();

      if (updateErr) throw updateErr;

      return res.status(200).json({
        ok: true,
        created: false,
        item: {
          ...updated,
          name: catItem.name,
          CategoryID: catItem.CategoryID ?? 22,
        }
      });
    }

    const { data: created, error: createErr } = await supabase
      .from("Ingredients")
      .insert([{ CatalogueID: catItem.CatalogueID, quantity: qty }])
      .select("IngredientID, quantity, CatalogueID")
      .single();

    if (createErr) throw createErr;

    return res.status(201).json({
      ok: true,
      created: true,
      item: {
        ...created,
        name: catItem.name,
        CategoryID: catItem.CategoryID ?? 22,
      }
    });
  } catch (err) {
    console.error("addFridgeItem error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/fridge/items?category=Fruits&search=ban
export async function getFridgeItems(req, res) {
  try {
    const category = String(req.query.category ?? "").trim() || null;
    const search = String(req.query.search ?? "").trim() || null;

    // Join Ingredients -> CatalogueTBL -> categories
    let query = supabase
    .from("Ingredients")
    .select(`
      IngredientID,
      quantity,
      CatalogueID,
      CatalogueTBL (
        CatalogueID,
        name,
        tags,
        CategoryID,
        categories (
          name
        )
      )
    `)
    .neq("quantity", 0)
    .order("IngredientID", { ascending: false });

    if (search) {
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
      CatalogueID: r.CatalogueID,
      name: r.CatalogueTBL?.name ?? "Unknown",
      tags: r.CatalogueTBL?.tags ?? [],
      CategoryID: r.CatalogueTBL?.CategoryID ?? 22,
      category: r.CatalogueTBL?.categories?.name ?? "Other / Uncategorized",
    }));

    res.json(items);
  } catch (err) {
    console.error("getFridgeItems error:", err.message);
    res.status(500).json({ error: err.message });
  }
}