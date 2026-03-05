import express from "express";
import { validate } from "../middleware/validate.mjs";
import { detectAndSaveBody } from "../validators/ml.schemas.mjs";
import { upload, detectAndSave } from "../controllers/ml.controller.mjs";

const router = express.Router();
router.post("/detect-and-save", upload.single("image"), detectAndSave);

export default router;