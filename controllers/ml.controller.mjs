import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { supabase } from "../db/supabase.mjs";
import { resolveCategoryFromCatalogue } from "./catalogue.helpers.mjs";

export const upload = multer({ dest: "uploads/" });

export async function detectImages(req, res) {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    if (!process.env.ML_SERVICE_URL) {
      return res.status(500).json({ error: "ML_SERVICE_URL is not configured on the server" });
    }

    const results = [];

    for (const file of req.files) {
      try {
        const form = new FormData();
        form.append("image", fs.createReadStream(file.path), file.originalname);

        const response = await axios.post(
          `${process.env.ML_SERVICE_URL}/detect`,
          form,
          {
            headers: form.getHeaders(),
            timeout: 30000
          }
        );

        const ingredient = response.data?.ingredient?.trim?.() || null;

        let categoryId = 22;
        let categoryName = "Other / Uncategorized";

        if (ingredient) {
          const resolved = await resolveCategoryFromCatalogue(ingredient, 22);
          categoryId = resolved?.CategoryID ?? 22;

          const { data: categoryRow } = await supabase
            .from("categories")
            .select("name")
            .eq("CategoryID", categoryId)
            .maybeSingle();

          categoryName = categoryRow?.name ?? "Other / Uncategorized";
        }

        results.push({
          tempId: file.filename,
          originalFilename: file.originalname,
          ingredient,
          categoryId,
          categoryName,
          quantity: 1,
          error: null
        });
} catch (err) {
      console.error("detectImages per-file error:", {
        file: file.originalname,
        message: err?.message,
        responseStatus: err?.response?.status,
        responseData: err?.response?.data
      });

      results.push({
        tempId: file.filename,
        originalFilename: file.originalname,
        ingredient: null,
        categoryId: null,
        categoryName: null,
        quantity: 1,
        error:
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          "Detection failed"
      });
      } finally {
        fs.unlink(file.path, () => {});
      }
    }

    return res.json({
      ok: true,
      results
    });
  } catch (err) {
    console.error("detectImages error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to detect images" });
  }
}

export async function saveDetectedItems(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({ error: "No items provided" });
    }

    let savedCount = 0;

    for (const rawItem of items) {
      const name = String(rawItem?.name ?? "").trim();
      if (!name) continue;

      const quantityRaw = Number(rawItem?.quantity ?? 1);
      const quantity = Number.isFinite(quantityRaw) && quantityRaw >= 1
        ? Math.floor(quantityRaw)
        : 1;

      const manualCategoryId = rawItem?.CategoryID ? Number(rawItem.CategoryID) : null;
      const resolved = await resolveCategoryFromCatalogue(name, 22);
      const categoryId = manualCategoryId || resolved?.CategoryID || 22;

      const { data: existing, error: findErr } = await supabase
        .from("Ingredients")
        .select("IngredientID, quantity, CategoryID")
        .ilike("name", name)
        .limit(1);

      if (findErr) throw findErr;

      if (existing?.length) {
        const row = existing[0];
        const newQty = Number(row.quantity ?? 0) + quantity;

        const { error: updErr } = await supabase
          .from("Ingredients")
          .update({
            quantity: newQty,
            CategoryID: row.CategoryID ?? categoryId
          })
          .eq("IngredientID", row.IngredientID);

        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("Ingredients")
          .insert([{
            name,
            quantity,
            CategoryID: categoryId
          }]);

        if (insErr) throw insErr;
      }

      savedCount++;
    }

    return res.json({
      ok: true,
      savedCount
    });
  } catch (err) {
    console.error("saveDetectedItems error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Failed to save detected items" });
  }
}