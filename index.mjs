import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import bodyParser from "body-parser";

import shoppingListRoutes from "./routes/shoppingList.mjs";
import { spawn } from "child_process";
//new routes
import recipesRoutes from "./routes/recipes.routes.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";
import favoriteRecipesRoutes from "./routes/favoriteRecipes.routes.mjs";


import { supabase } from "./db/supabase.mjs";

const app = express();
const PORT = process.env.PORT || 5050;

// start python in dev
if (process.env.NODE_ENV !== "production") {
  const ml = spawn("python", ["-m", "uvicorn", "app:app", "--port", "8000", "--reload"], {
    cwd: "./ml_service",
    stdio: "inherit",
    shell: true
  });
  process.on("exit", () => ml.kill());
}

app.use(cors({ origin: ["http://localhost:4200"], credentials: true }));
app.use(express.json());
app.use(bodyParser.json());

// routes
app.use("/api", shoppingListRoutes);
app.use("/api", fridgeRoutes);
app.use("/api", mlRoutes);

// Supabase test
(async () => {
  try {
    const { error } = await supabase.from("Ingredients").select("IngredientID").limit(1);
    if (error) throw error;
    console.log("Supabase connected successfully");
  } catch (err) {
    console.error("Supabase connection error:", err.message);
  }
})();

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send("Uh oh! An unexpected error occurred.");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));