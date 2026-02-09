import express from "express";
import { getFavoriteRecipes , addFavoriteRecipe , removeFavoriteRecipe } from "../controllers/favorites.controller.mjs";

const router = express.Router();

router.get("/favorite-recipes", getFavoriteRecipes);
router.post("/favorite-recipes", addFavoriteRecipe);
router.delete("/favorite-recipes/:recipeId", removeFavoriteRecipe);

export default router;
