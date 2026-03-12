import express from "express";
import {
  upload,
  detectImages,
  saveDetectedItems
} from "../controllers/ml.controller.mjs";

const router = express.Router();

router.post("/detect-images", upload.array("images", 10), detectImages);
router.post("/save-detected-items", saveDetectedItems);

export default router;