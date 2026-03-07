import express from "express";
import { addFridgeItem, getFridgeItems , getCategories} from "../controllers/fridge.controller.mjs";

const router = express.Router();
router.post("/fridge/items",  addFridgeItem);
router.get("/fridge/items", validate({ query: fridgeGetItemsQuerySchema }), getFridgeItems);
router.get("/fridge/categories", getCategories);

export default router;
