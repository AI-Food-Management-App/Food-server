import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import shoppingListRoutes from "./routes/shoppingList.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";
import authRoutes from "./routes/auth.routes.mjs";
import profileRoutes from "./routes/profile.routes.mjs";
import { supabase } from "./db/supabase.mjs";
import fs from "fs";
import { requireAuth } from "./middleware/auth.mjs";
import dotenv from "dotenv";

const app = express();
const PORT = process.env.PORT || 5050;

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const allowedOrigins = [
  "http://localhost:4200",
  "http://localhost:8100",
  process.env.FRONTEND_URL,        
].filter(Boolean);                 
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "M.ai Food Server",
    version: "1.0.0"
  });
});

app.use("/api", authRoutes);

app.use("/api", requireAuth, fridgeRoutes);
app.use("/api", requireAuth, shoppingListRoutes);
app.use("/api", requireAuth, mlRoutes);
app.use("/api", requireAuth, profileRoutes);

(async () => {
  try {
    const { error } = await supabase
      .from("Ingredients")
      .select("IngredientID")
      .limit(1);
    if (error) throw error;
    console.log("Supabase connected successfully");
  } catch (err) {
    console.error("Supabase connection error:", err.message);
  }
})();

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: err.message || "Unexpected server error" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));