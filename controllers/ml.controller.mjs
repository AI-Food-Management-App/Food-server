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

    const form = new FormData();
    form.append("image", fs.createReadStream(req.file.path));

    const pythonApi = `${process.env.ML_SERVICE_URL || "http://localhost:8000"}/detect`;
    const mlResp = await axios.post(pythonApi, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    fs.unlink(req.file.path, () => {});

    const name = mlResp.data?.ingredient?.trim?.() || null;
    if (!name) return res.json({ ok: true, ingredient: null, saved: false });

    const { CategoryID } = await resolveCategoryFromCatalogue(name, 22);

    // increment quantity for SAME detected label (keeps user's wording = detected wording)
    const { data: existing, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, quantity, CategoryID")
      .ilike("name", name)
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

      return res.json({ ok: true, ingredient: name, CategoryID: row.CategoryID ?? CategoryID, quantity: newQty, updated: true });
    }

    const { error: insErr } = await supabase
      .from("Ingredients")
      .insert([{ name, quantity: 1, CategoryID }]);

    if (insErr) throw insErr;

    return res.json({ ok: true, ingredient: name, CategoryID, quantity: 1, created: true });
  } catch (err) {
    console.error("detectAndSave error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to detect/save ingredient" });
  }
}