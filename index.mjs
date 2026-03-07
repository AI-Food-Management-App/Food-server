import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import shoppingListRoutes from "./routes/shoppingList.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";


import { supabase } from "./db/supabase.mjs";
import profileRoutes from "./routes/profile.routes.mjs";

const app = express();
const PORT = process.env.PORT || 5050;


app.use(cors({ origin: ["http://localhost:4200"], credentials: true }));
app.use(express.json());

// routes
app.use("/api", shoppingListRoutes);
app.use("/api", fridgeRoutes);
app.use("/api", mlRoutes);

//added to check render server
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Food server is running" });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

(async () => {
  try {
    const { error } = await supabase.from("Ingredients").select("IngredientID").limit(1);
    if (error) throw error;
    console.log("Supabase connected successfully");
  } catch (err) {
    console.error("Supabase connection error:", err.message);
  }
})();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));