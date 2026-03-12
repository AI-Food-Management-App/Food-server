import multer from "multer";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { supabase } from "../db/supabase.mjs";

export const upload = multer({ dest: "uploads/" });

function getFormLength(form) {
  return new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) reject(err);
      else resolve(length);
    });
  });
}

export async function detectImages(req, res) {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    if (!process.env.ML_SERVICE_URL) {
      return res.status(500).json({ error: "ML_SERVICE_URL is not configured on the server" });
    }

    const form = new FormData();

    for (const file of req.files) {
      const fileBuffer = fs.readFileSync(file.path);
      form.append("images", fileBuffer, {
        filename: file.originalname,
        contentType: file.mimetype || "image/jpeg",
        knownLength: fileBuffer.length
      });
    }

    const contentLength = await getFormLength(form);

    let pythonResponse;
    try {
      pythonResponse = await axios.post(
        `${process.env.ML_SERVICE_URL}/detect-images`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            "Content-Length": contentLength
          },
          timeout: 120000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );
    } catch (err) {
      console.error("Batch ML detect error:", {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        responseStatus: err?.response?.status,
        responseData: err?.response?.data
      });

      return res.status(500).json({
        error:
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          "Batch detection failed"
      });
    } finally {
      for (const file of req.files) {
        fs.unlink(file.path, () => {});
      }
    }

    const pythonResults = pythonResponse.data?.results ?? [];

    const enrichedResults = [];

    for (const result of pythonResults) {
      let categoryId = 22;
      let categoryName = "Other / Uncategorized";

      if (result.ingredient) {
        const { data: categoryRow } = await supabase
          .from("categories")
          .select("CategoryID, name")
          .ilike("name", "%")
          .eq("CategoryID", 22)
          .maybeSingle();

        if (result.categoryId) {
          categoryId = result.categoryId;
        }
        if (result.categoryName) {
          categoryName = result.categoryName;
        } else if (categoryRow?.name) {
          categoryName = categoryRow.name;
        }
      }

      enrichedResults.push({
        tempId: result.tempId ?? result.filename ?? `${Date.now()}-${Math.random()}`,
        originalFilename: result.originalFilename ?? result.filename ?? "image",
        ingredient: result.ingredient ?? null,
        categoryId,
        categoryName,
        quantity: 1,
        error: result.error ?? null
      });
    }

    return res.json({
      ok: true,
      results: enrichedResults
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