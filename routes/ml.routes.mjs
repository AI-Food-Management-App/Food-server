import express from "express";
import { upload, detectAndSave } from "../controllers/ml.controller.mjs";

const router = express.Router();
router.post("/detect-and-save", upload.single("image"), detectAndSave);

export default router;