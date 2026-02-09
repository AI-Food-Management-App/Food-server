import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import shoppingListRoutes from "./routes/shoppingList.mjs";
import { spawn } from "child_process";
//new routes
import recipesRoutes from "./routes/recipes.routes.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";
import favoriteRecipesRoutes from "./routes/favoriteRecipes.routes.mjs";


import posts from "./routes/posts.mjs";
import { supabase } from "./db/supabase.mjs";

import bodyParser from 'body-parser';
import multer from 'multer';
import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const app = express(); 
const PORT = process.env.PORT || 5050;

//starts python production --should automatically use phone 
if (process.env.NODE_ENV !== "production") {
  const ml = spawn("py", ["-m", "uvicorn", "app:app", "--port", "8000", "--reload"], {
    cwd: "./ml_service",
    stdio: "inherit",
    shell: true
  });

  process.on("exit", () => ml.kill());
}

//calls the main frointend  -- elliminating dev calls --look into later and change if needed
app.use(cors({
  origin: ["http://localhost:4200"],
  credentials: true
}));


app.use(express.json());
app.use(bodyParser.json());
app.use("/api", shoppingListRoutes);

//new routes
app.use("/api", recipesRoutes);
app.use("/api", fridgeRoutes);
app.use("/api", mlRoutes);
app.use("/api", favoriteRecipesRoutes);



// Test Supabase connection on startup
(async () => {
  try {
    const { data, error } = await supabase
      .from('Ingredients')
      .select('count')
      .limit(1);
    

      //the call for if its connected or no

    if (error) throw error;
    console.log("Supabase connected successfully");
  } catch (err) {
    console.error("Supabase connection error:", err.message);
  }
})();

//existing favourites

app.post("/api/favorites", async (req, res) => {
  try {
    const { id, name, image, favourite } = req.body;
    
    // Validate required fields
    if (!id || !name || !image) {
      return res.status(400).send({ error: "Missing required fields: id, name, and image are mandatory" });
    }
    
    const newIngredient = {
      id: parseInt(id),
      name,
      image,
      favourite: favourite !== undefined ? favourite : null
    };
    
    const { data, error } = await supabase
      .from('Ingredients')
      .insert([newIngredient])
      .select();
    
    if (error) throw error;
    
    res.status(201).send("Saved to favourites!");
  } catch (err) {
    console.error("Error saving to favorites:", err);
    res.status(500).send("Error saving recipe");
  }
});

app.delete("/api/favorites/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const { data, error } = await supabase
      .from('Ingredients')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.status(404).send("Ingredient not found");
    }
    
    res.status(200).send("Deleted from favourites!");
  } catch (err) {
    console.error("Error deleting from favorites:", err);
    res.status(500).send("Error deleting recipe");
  }
});

app.get("/api/favorites", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Ingredients')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).send("Error fetching favourites");
  }
});

// === NEW: ML IMAGE DETECTION ROUTE ===
const upload = multer({ dest: "uploads/" }); // temp folder for images

app.post("/api/detect-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ error: "No file uploaded" });

    // forward the uploaded image to the Python ML API
    const form = new FormData();
    form.append("image", fs.createReadStream(req.file.path));

    const pythonApi = `${process.env.ML_SERVICE_URL || "http://localhost:8000"}/detect`;
    const response = await axios.post(pythonApi, form, {
      headers: form.getHeaders(),
      timeout: 20000,
    });

    // delete temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Could not delete temp file:", err);
    });

    res.json(response.data);
  } catch (error) {
    console.error("ML service error:", error.message);
    res.status(500).json({ error: "Failed to detect ingredients" });
  }
});

// === END ML ROUTE ===

// Mount routes correctly
app.use("/api/posts", posts);  // This gives you /api/posts endpoints

// Error handling middleware
app.use((err, _req, res, next) => {
  res.status(500).send("Uh oh! An unexpected error occurred.");
});

// Start server (remove duplicate listen if present)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


//npm run dev