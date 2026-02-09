import { spoonacularComplexSearch, spoonacularRecipeById } from "../services/spoonacular.service.mjs";

export async function getRecipes(req, res) {
  try {
    const ingredients = String(req.query.ingredients ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const maxReadyTime = req.query.maxReadyTime ? Number(req.query.maxReadyTime) : undefined;
    const intolerances = String(req.query.intolerances ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const diet = req.query.diet ? String(req.query.diet) : undefined;

    const data = await spoonacularComplexSearch({ ingredients, maxReadyTime, intolerances, diet });
    res.json(data);
  } catch (err) {
    console.error("recipes getRecipes error:", err.message);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
}

export async function getRecipeDetails(req, res) {
  try {
    const recipeId = Number(req.params.id);
    const data = await spoonacularRecipeById(recipeId);
    res.json(data);
  } catch (err) {
    console.error("recipes getRecipeDetails error:", err.message);
    res.status(500).json({ error: "Failed to fetch recipe details" });
  }
}
