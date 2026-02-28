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

    const ingredient = mlResp.data?.ingredient?.trim?.() || null;
    if (!ingredient) return res.json({ ok: true, ingredient: null, saved: false });

    // If ingredient exists -> quantity + 1, else create with quantity 1
    const { data: existing, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, quantity")
      .ilike("name", ingredient)
      .limit(1);

    if (findErr) throw findErr;

    if (existing?.length) {
      const row = existing[0];
      const newQty = Number(row.quantity ?? 0) + 1;

      const { error: updateErr } = await supabase
        .from("Ingredients")
        .update({ quantity: newQty })
        .eq("IngredientID", row.IngredientID);

      if (updateErr) throw updateErr;
      return res.json({ ok: true, ingredient, saved: true, updated: true, quantity: newQty });
    }

    const { error: insertErr } = await supabase
      .from("Ingredients")
      .insert([{ name: ingredient, quantity: 1, CategoryID: 22 }]); // default category

    if (insertErr) throw insertErr;

    return res.json({ ok: true, ingredient, saved: true, created: true, quantity: 1 });
  } catch (err) {
    console.error("detectAndSave error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to detect/save ingredient" });
  }
}