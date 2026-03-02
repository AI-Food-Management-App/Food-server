import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { supabase } from "../db/supabase.mjs";

export const upload = multer({ dest: "uploads/" });

export async function detectAndSave(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const form = new FormData();
    form.append("image", fs.createReadStream(req.file.path));

    const pythonApi = `${process.env.ML_SERVICE_URL || "http://localhost:8000"}/detect`;

    const mlResp = await axios.post(pythonApi, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    // cleanup temp file
    fs.unlink(req.file.path, () => {});

    const ingredientName = mlResp.data?.ingredient?.trim?.() || null;
    if (!ingredientName) return res.json({ ok: true, ingredient: null, saved: false });

    // 1) Ensure in CatalogueTBL (default uncategorized)
    const catItem = await findOrCreateCatalogueItemByName(ingredientName, 22);

    // 2) Update inventory (Ingredients) by CatalogueID
    const { data: existingInv, error: invErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, quantity, CatalogueID")
      .eq("CatalogueID", catItem.CatalogueID)
      .limit(1);

    if (invErr) throw invErr;

    if (existingInv?.length) {
      const row = existingInv[0];
      const newQty = Number(row.quantity ?? 0) + 1;

      const { error: updErr } = await supabase
        .from("Ingredients")
        .update({ quantity: newQty })
        .eq("IngredientID", row.IngredientID);

      if (updErr) throw updErr;
      return res.json({ ok: true, ingredient: catItem.name, saved: true, updated: true, quantity: newQty });
    }

    const { error: insErr } = await supabase
      .from("Ingredients")
      .insert([{ CatalogueID: catItem.CatalogueID, quantity: 1 }]);

    if (insErr) throw insErr;

    return res.json({ ok: true, ingredient: catItem.name, saved: true, created: true, quantity: 1 });
  } catch (err) {
    console.error("detectAndSave error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to detect/save ingredient" });
  }
}