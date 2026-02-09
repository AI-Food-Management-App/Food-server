import express from "express";
import { getRecipes, getRecipeDetails } from "../controllers/recipes.controller.mjs";

const router = express.Router();

router.get("/recipes", getRecipes);
router.get("/recipes/:id", getRecipeDetails);

export default router;
