import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { supabase } from "../db/supabase.mjs";

export const upload = multer({ dest: "uploads/" });

export async function detectAndSave(req, res) {
  try {
    const userID = Number(req.body.userID ?? 1); // until auth exists
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const form = new FormData();
    form.append("image", fs.createReadStream(req.file.path));

    const pythonApi = `${process.env.ML_SERVICE_URL || "http://localhost:8000"}/detect`;
    const mlResp = await axios.post(pythonApi, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    fs.unlink(req.file.path, () => {});
    const ingredient = mlResp.data?.ingredient?.trim?.() || null;

    if (!ingredient) return res.json({ ok: true, ingredient: null, saved: false });

    // save ingredient to Ingredients table
    const { data: existing, error: findErr } = await supabase
      .from("Ingredients")
      .select("IngredientID, name")
      .eq("userID", userID)
      .ilike("name", ingredient)
      .limit(1);

    if (findErr) throw findErr;

    if (!existing?.length) {
      const { error: insertErr } = await supabase
        .from("Ingredients")
        .insert([{ userID, name: ingredient }]);

      if (insertErr) throw insertErr;
    }

    res.json({ ok: true, ingredient, saved: true });
  } catch (err) {
    console.error("detectAndSave error:", err.message);
    res.status(500).json({ error: "Failed to detect/save ingredient" });
  }
}
