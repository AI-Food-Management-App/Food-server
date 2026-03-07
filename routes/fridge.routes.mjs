import express from "express";
import { addFridgeItem, getFridgeItems , getCategories} from "../controllers/fridge.controller.mjs";
import { validate } from "../middleware/validate.mjs";
import { fridgeGetItemsQuerySchema } from "../validators/fridge.schemas.mjs";

const router = express.Router();
router.post("/fridge/items",  addFridgeItem);
router.get("/fridge/items", validate({ query: fridgeGetItemsQuerySchema }), getFridgeItems);
router.get("/fridge/categories", getCategories);

export default router;
