import express from "express";
import { validate } from "../middleware/validate.mjs";
import { fridgeAddItemBody, fridgeGetItemsQuery } from "../validators/fridge.schemas.mjs";
import { addFridgeItem, getFridgeItems , getCategories} from "../controllers/fridge.controller.mjs";

const router = express.Router();
router.post("/fridge/items", validate({ body: fridgeAddItemBody }), addFridgeItem);
router.get("/fridge/items", validate({ query: fridgeGetItemsQuery }), getFridgeItems);
router.get("/fridge/categories", getCategories);

export default router;
