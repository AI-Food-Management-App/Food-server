import { supabase } from "../db/supabase.mjs";

// GET /api/favorite-recipes?userID=1
export async function getFavoriteRecipes(req, res) {
  try {
    const userID = Number(req.query.userID ?? 1);

    const { data, error } = await supabase
      .from("FavoriteRecipes")
      .select("recipeId, title, image, createdAt")
      .eq("userID", userID)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    console.error("getFavoriteRecipes error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// POST /api/favorite-recipes
// body: { userID, recipeId, title, image }
export async function addFavoriteRecipe(req, res) {
  try {
    const userID = Number(req.body.userID ?? 1);
    const recipeId = Number(req.body.recipeId);
    const title = String(req.body.title ?? "").trim();
    const image = req.body.image ? String(req.body.image) : null;

    if (!recipeId || !title) {
      return res.status(400).json({ error: "recipeId and title are required" });
    }

    // Upsert with unique (userID, recipeId)
    const { data, error } = await supabase
      .from("FavoriteRecipes")
      .upsert(
        [{ userID, recipeId, title, image }],
        { onConflict: "userID,recipeId" }
      )
      .select("recipeId, title, image, createdAt")
      .single();

    if (error) throw error;
    res.status(201).json({ ok: true, favorite: data });
  } catch (err) {
    console.error("addFavoriteRecipe error:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// DELETE /api/favorite-recipes/:recipeId?userID=1
export async function removeFavoriteRecipe(req, res) {
  try {
    const userID = Number(req.query.userID ?? 1);
    const recipeId = Number(req.params.recipeId);

    if (!recipeId) return res.status(400).json({ error: "recipeId is required" });

    const { data, error } = await supabase
      .from("FavoriteRecipes")
      .delete()
      .eq("userID", userID)
      .eq("recipeId", recipeId)
      .select("recipeId");

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ ok: false, message: "Favorite recipe not found" });
    }

    res.json({ ok: true, deleted: recipeId });
  } catch (err) {
    console.error("removeFavoriteRecipe error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
