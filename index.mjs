import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import shoppingListRoutes from "./routes/shoppingList.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";


import { supabase } from "./db/supabase.mjs";

const app = express();
const PORT = process.env.PORT || 5050;


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