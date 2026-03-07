import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import shoppingListRoutes from "./routes/shoppingList.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";
import authRoutes from "./routes/auth.routes.mjs";
import { requireAuth } from "./middleware/auth.middleware.mjs";
import { supabase } from "./db/supabase.mjs";
import profileRoutes from "./routes/profile.routes.mjs";

const app = express();
const PORT = process.env.PORT || 5050;

 
app.use(cors({ origin: ["http://localhost:4200"], credentials: true }));
app.use(express.json());

// routes
app.use("/api", authRoutes);

app.use("/api", requireAuth, fridgeRoutes);
app.use("/api", requireAuth, shoppingListRoutes);
app.use("/api", requireAuth, mlRoutes);
app.use("/api", requireAuth, profileRoutes);

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