import express from "express";
import { addFridgeItem, getFridgeItems } from "../controllers/fridge.controller.mjs";

const router = express.Router();
router.post("/fridge/items", addFridgeItem);
router.get("/fridge/items", getFridgeItems);

export default router;
