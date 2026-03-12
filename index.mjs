import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import shoppingListRoutes from "./routes/shoppingList.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";
import authRoutes from "./routes/auth.routes.mjs";
import profileRoutes from "./routes/profile.routes.mjs";
import { supabase } from "./db/supabase.mjs";

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api", fridgeRoutes);
app.use("/api", shoppingListRoutes);
app.use("/api", mlRoutes);
app.use("/api", profileRoutes);

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
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: err.message || "Unexpected server error" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));