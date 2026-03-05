import "./loadEnvironment.mjs";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import shoppingListRoutes from "./routes/shoppingList.mjs";
import fridgeRoutes from "./routes/fridge.routes.mjs";
import mlRoutes from "./routes/ml.routes.mjs";

export function createApp() {
  const app = express();

  app.use(cors({ origin: ["http://localhost:4200"], credentials: true }));
  app.use(express.json());
  app.use(bodyParser.json());

  app.use("/api", shoppingListRoutes);
  app.use("/api", fridgeRoutes);
  app.use("/api", mlRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).send("Uh oh! An unexpected error occurred.");
  });

  return app;
}