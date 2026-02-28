import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { supabase } from "../db/supabase.mjs";

export const upload = multer({ dest: "uploads/" });

const DEFAULT_CATEGORY_ID = 22; // Other / Uncategorized

export async function detectAndSave(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // 1) Send image to ML service
    const form = new FormData();
    form.append("image", fs.createReadStream(req.file.path));

    const response = await axios.post(
    `${process.env.ML_SERVICE_URL}/detect`,
     formData,
    { headers: formData.getHeaders() }
   );

    fs.unlink(req.file.path, () => {});

    const ingredient = mlResp.data?.ingredient?.trim?.() || null;
    if (!ingredient) return res.json({ ok: true, ingredient: null, saved: false });

    // 2) DB-first lookup (case-insensitive)
    const { data: existing, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, name, quantity, CategoryID")
      .ilike("name", ingredient)
      .limit(1);

    if (findErr) throw findErr;

    // 3) If exists → increment quantity (keep existing CategoryID)
    if (existing?.length) {
      const row = existing[0];
      const newQty = Number(row.quantity ?? 0) + 1;

      const { error: updateErr } = await supabase
        .from("Ingredients")
        .update({ quantity: newQty })
        .eq("IngredientID", row.IngredientID);

      if (updateErr) throw updateErr;

      return res.json({
        ok: true,
        ingredient: row.name,
        saved: true,
        updated: true,
        quantity: newQty,
        CategoryID: row.CategoryID,
      });
    }

    // 4) Else create uncategorized
    const { error: insertErr } = await supabase
      .from("Ingredients")
      .insert([{ name: ingredient, quantity: 1, CategoryID: DEFAULT_CATEGORY_ID }]);

    if (insertErr) throw insertErr;

    return res.json({
      ok: true,
      ingredient,
      saved: true,
      created: true,
      quantity: 1,
      CategoryID: DEFAULT_CATEGORY_ID,
    });
  } catch (err) {
    console.error("detectAndSave error:", err.message);
    res.status(500).json({ error: err.message });
  }
}