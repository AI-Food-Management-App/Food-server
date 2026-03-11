import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { supabase } from "../db/supabase.mjs";
import { resolveCategoryFromCatalogue } from "./catalogue.helpers.mjs";

export const upload = multer({ dest: "uploads/" });

export async function detectAndSave(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // ← shows in Render logs so you can confirm the URL is set
    console.log("ML_SERVICE_URL is:", process.env.ML_SERVICE_URL ?? "NOT SET");

    if (!process.env.ML_SERVICE_URL) {
      return res.status(500).json({ error: "ML_SERVICE_URL is not configured on the server" });
    }
    const form = new FormData();
    form.append("image", fs.createReadStream(req.file.path));

    const response = await axios.post(
      `${process.env.ML_SERVICE_URL}/detect`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000
      }
    );

    fs.unlink(req.file.path, () => {});

    const ingredient = response.data?.ingredient?.trim?.() || null;
    if (!ingredient) return res.json({ ok: true, ingredient: null, saved: false });

    // ↓ was: resolveCategoryFromCatalogue(name, 22) — name is undefined
    const { CategoryID } = await resolveCategoryFromCatalogue(ingredient, 22);

    // ↓ was: .ilike("name", name) — name is undefined
    const { data: existing, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, quantity, CategoryID")
      .ilike("name", ingredient)
      .limit(1);

    if (findErr) throw findErr;

    if (existing?.length) {
      const row = existing[0];
      const newQty = Number(row.quantity ?? 0) + 1;

      const { error: updErr } = await supabase
        .from("Ingredients")
        .update({ quantity: newQty, CategoryID: row.CategoryID ?? CategoryID })
        .eq("IngredientID", row.IngredientID);

      if (updErr) throw updErr;

      // ↓ was: ingredient: name — name is undefined
      return res.json({
        ok: true,
        ingredient,
        CategoryID: row.CategoryID ?? CategoryID,
        quantity: newQty,
        updated: true
      });
    }

    // ↓ was: insert [{ name, ... }] — name is undefined
    const { error: insErr } = await supabase
      .from("Ingredients")
      .insert([{ name: ingredient, quantity: 1, CategoryID }]);

    if (insErr) throw insErr;

    return res.json({
      ok: true,
      ingredient,
      CategoryID,
      quantity: 1,
      created: true
    });

  } catch (err) {
    console.error("detectAndSave error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to detect/save ingredient" });
  }
}