import express from "express";
import { addFridgeItem, getFridgeItems , getCategories, updateFridgeItem} from "../controllers/fridge.controller.mjs";

const router = express.Router();
router.post("/fridge/items", addFridgeItem);
router.get("/fridge/items", getFridgeItems);
router.patch("/fridge/items/:itemId", updateFridgeItem);
router.get("/fridge/categories", getCategories);

export default router;
