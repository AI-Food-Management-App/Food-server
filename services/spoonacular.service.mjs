import axios from "axios";

const BASE_URL = process.env.SPOONACULAR_BASE_URL || "https://api.spoonacular.com";
const API_KEY = process.env.SPOONACULAR_API_KEY;

if (!API_KEY) {
  console.warn("Missing SPOONACULAR_API_KEY in backend env");
}

export async function spoonacularComplexSearch({ ingredients = [], maxReadyTime, intolerances = [], diet }) {
  const params = {
    apiKey: API_KEY,
    addRecipeInformation: true,
    addNutritionInformation: true,
  };

  if (ingredients.length) params.includeIngredients = ingredients.join(",");
  if (maxReadyTime) params.maxReadyTime = maxReadyTime;
  if (intolerances.length) params.intolerances = intolerances.join(",");
  if (diet) params.diet = diet;

  const url = `${BASE_URL}/recipes/complexSearch`;
  const { data } = await axios.get(url, { params, timeout: 20000 });
  return data;
}

export async function spoonacularRecipeById(recipeId) {
  const url = `${BASE_URL}/recipes/${recipeId}/information`;
  const { data } = await axios.get(url, {
    params: { apiKey: API_KEY, includeNutrition: true },
    timeout: 20000,
  });
  return data;
}
