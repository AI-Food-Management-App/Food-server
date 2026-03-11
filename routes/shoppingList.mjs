import express from "express";
import { supabase } from "../db/supabase.mjs";

const router = express.Router();

async function getOrCreateIngredientId({ name }) {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) throw new Error("Ingredient name is required");

  const { data: existing, error: findErr } = await supabase
    .from("Ingredients")
    .select("IngredientID, name")
    .ilike("name", cleanName)
    .limit(1);

  if (findErr) throw findErr;

  if (existing && existing.length > 0) {
    return existing[0].IngredientID;
  }

  const { data: created, error: createErr } = await supabase
    .from("Ingredients")
    .insert([{ name: cleanName, quantity: 0, CategoryID: 22 }])
    .select("IngredientID")
    .single();

  if (createErr) throw createErr;
  if (!created?.IngredientID) throw new Error("Could not read IngredientID after insert");

  return created.IngredientID;
}

async function cleanupOldClosedLists() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 1);

  const cutoffIso = cutoff.toISOString();

  const { data: oldLists, error: findErr } = await supabase
    .from("ShoppingLists")
    .select("listID")
    .eq("status", "closed")
    .lt("closedAt", cutoffIso);

  if (findErr) throw findErr;

  const ids = (oldLists ?? []).map(l => l.listID);
  if (!ids.length) return;

  const { error: deleteItemsErr } = await supabase
    .from("ShoppingListItems")
    .delete()
    .in("listID", ids);

  if (deleteItemsErr) throw deleteItemsErr;

  const { error: deleteListsErr } = await supabase
    .from("ShoppingLists")
    .delete()
    .in("listID", ids);

  if (deleteListsErr) throw deleteListsErr;
}

/**
 * GET current open list
 */
router.get("/shopping-lists/open", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("ShoppingLists")
      .select("*")
      .eq("status", "open")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data ?? null);
  } catch (err) {
    console.error("Get open list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET closed list history
 */
router.get("/shopping-lists/history", async (_req, res) => {
  try {
    await cleanupOldClosedLists();

    const { data, error } = await supabase
      .from("ShoppingLists")
      .select("*")
      .eq("status", "closed")
      .order("closedAt", { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error("Get history error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a new shopping list
 * body: { name }
 * only allowed if no open list already exists
 */
router.post("/shopping-lists", async (req, res) => {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) {
      return res.status(400).json({ error: "List name is required" });
    }

    const { data: existingOpen, error: existingErr } = await supabase
      .from("ShoppingLists")
      .select("*")
      .eq("status", "open")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) throw existingErr;

    if (existingOpen) {
      return res.status(409).json({
        error: "Only one shopping list can be open at a time",
        openList: existingOpen
      });
    }

    const { data, error } = await supabase
      .from("ShoppingLists")
      .insert([{
        name,
        status: "open",
        closedAt: null
      }])
      .select("*")
      .single();

    if (error) throw error;

    res.status(201).json({
      listID: data.listID,
      name: data.name,
      status: data.status,
      createdAt: data.createdAt,
      closedAt: data.closedAt ?? null
    });
  } catch (err) {
    console.error("Create list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all items in a list
 */
router.get("/shopping-lists/:listID", async (req, res) => {
  try {
    const listID = Number(req.params.listID);

    const { data, error } = await supabase
      .from("ShoppingListItems")
      .select(`
        itemID,
        checked,
        quantity,
        ingredientID,
        Ingredients (
          IngredientID,
          name
        )
      `)
      .eq("listID", listID)
      .order("itemID", { ascending: true });

    if (error) throw error;

    const items = (data ?? []).map((row) => ({
      itemID: row.itemID,
      checked: row.checked,
      quantity: row.quantity,
      ingredientID: row.ingredientID,
      name: row.Ingredients?.name ?? "Unknown",
    }));

    res.json(items);
  } catch (err) {
    console.error("Get list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add item to list
 */
router.post("/shopping-lists/:listID/items", async (req, res) => {
  try {
    const listID = Number(req.params.listID);
    const name = String(req.body.name ?? "").trim();

    if (!name) {
      return res.status(400).json({ error: "Item name is required" });
    }

    let quantity = Number(req.body.quantity ?? 1);
    if (!Number.isFinite(quantity)) quantity = 1;
    quantity = Math.floor(quantity);

    if (quantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const { data: list, error: listErr } = await supabase
      .from("ShoppingLists")
      .select("listID, status")
      .eq("listID", listID)
      .maybeSingle();

    if (listErr) throw listErr;
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    if (list.status !== "open") {
      return res.status(400).json({ error: "Cannot add items to a closed list" });
    }

    const ingredientID = await getOrCreateIngredientId({ name });

    const { data, error } = await supabase
      .from("ShoppingListItems")
      .upsert(
        [{ listID, ingredientID, quantity, checked: false }],
        { onConflict: "listID,ingredientID" }
      )
      .select("itemID, listID, ingredientID, quantity, checked");

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    res.status(201).json(row);
  } catch (err) {
    console.error("Add item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Toggle item checked
 */
router.patch("/shopping-lists/:listID/items/:itemID", async (req, res) => {
  try {
    const listID = Number(req.params.listID);
    const itemID = Number(req.params.itemID);
    const checked = Boolean(req.body.checked);

    const { data: list, error: listErr } = await supabase
      .from("ShoppingLists")
      .select("listID, status")
      .eq("listID", listID)
      .maybeSingle();

    if (listErr) throw listErr;
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    if (list.status !== "open") {
      return res.status(400).json({ error: "Cannot edit a closed list" });
    }

    const { data, error } = await supabase
      .from("ShoppingListItems")
      .update({ checked })
      .eq("itemID", itemID)
      .eq("listID", listID)
      .select("itemID, checked")
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Toggle item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete item
 */
router.delete("/shopping-lists/:listID/items/:itemID", async (req, res) => {
  try {
    const listID = Number(req.params.listID);
    const itemID = Number(req.params.itemID);

    const { data: list, error: listErr } = await supabase
      .from("ShoppingLists")
      .select("listID, status")
      .eq("listID", listID)
      .maybeSingle();

    if (listErr) throw listErr;
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    if (list.status !== "open") {
      return res.status(400).json({ error: "Cannot edit a closed list" });
    }

    const { error } = await supabase
      .from("ShoppingListItems")
      .delete()
      .eq("itemID", itemID)
      .eq("listID", listID);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Confirm checked items into Ingredients
 * checked items are added to inventory and removed from the shopping list
 */
router.post("/shopping-lists/:listID/confirm", async (req, res) => {
  try {
    const listID = Number(req.params.listID);

    const { data: list, error: listErr } = await supabase
      .from("ShoppingLists")
      .select("listID, status")
      .eq("listID", listID)
      .maybeSingle();

    if (listErr) throw listErr;
    if (!list) return res.status(404).json({ error: "Shopping list not found" });
    if (list.status !== "open") {
      return res.status(400).json({ error: "Cannot confirm items from a closed list" });
    }

    const { data: checkedItems, error: itemsErr } = await supabase
      .from("ShoppingListItems")
      .select(`
        itemID,
        checked,
        quantity,
        ingredientID,
        Ingredients (
          IngredientID,
          name,
          quantity,
          CategoryID,
          expiryDate
        )
      `)
      .eq("listID", listID)
      .eq("checked", true);

    if (itemsErr) throw itemsErr;

    if (!checkedItems?.length) {
      return res.json({ ok: true, moved: 0, message: "No checked items to confirm" });
    }

    for (const row of checkedItems) {
      const ingredient = row.Ingredients;
      const addQty = Number(row.quantity ?? 1);

      const currentQty = Number(ingredient?.quantity ?? 0);

      const { error: updateErr } = await supabase
        .from("Ingredients")
        .update({
          quantity: currentQty + addQty
        })
        .eq("IngredientID", row.ingredientID);

      if (updateErr) throw updateErr;
    }

    const checkedItemIds = checkedItems.map(i => i.itemID);

    const { error: deleteErr } = await supabase
      .from("ShoppingListItems")
      .delete()
      .in("itemID", checkedItemIds);

    if (deleteErr) throw deleteErr;

    res.json({
      ok: true,
      moved: checkedItems.length
    });
  } catch (err) {
    console.error("Confirm checked items error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Close shopping list
 */
router.patch("/shopping-lists/:listID/close", async (req, res) => {
  try {
    const listID = Number(req.params.listID);

    const { data: list, error: listErr } = await supabase
      .from("ShoppingLists")
      .select("*")
      .eq("listID", listID)
      .maybeSingle();

    if (listErr) throw listErr;
    if (!list) return res.status(404).json({ error: "Shopping list not found" });

    if (list.status === "closed") {
      return res.json({ ok: true, list });
    }

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("ShoppingLists")
      .update({
        status: "closed",
        closedAt: nowIso
      })
      .eq("listID", listID)
      .select("*")
      .single();

    if (error) throw error;

    res.json({ ok: true, list: data });
  } catch (err) {
    console.error("Close list error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;