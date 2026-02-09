// import express from "express";
// import multer from "multer";
// import FormData from "form-data";
// import fs from "fs";
// import axios from "axios";

// const router = express.Router();
// const upload = multer({ dest: "uploads/" });

// router.post("/detect-image", upload.single("image"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//     const pythonUrl = "http://localhost:8000/detect";

//     const form = new FormData();
//     form.append("image", fs.createReadStream(req.file.path));

//     const response = await axios.post(pythonUrl, form, {
//       headers: form.getHeaders(),
//     });

//     fs.unlink(req.file.path, () => {}); // delete tmp file

//     res.json(response.data);

//   } catch (err) {
//     console.error("ML Service Error:", err.message);
//     res.status(500).json({ error: "Failed to detect ingredients" });
//   }
// });

// export default router;


import express from "express";
import { upload, detectAndSave } from "../controllers/ml.controller.mjs";

const router = express.Router();
router.post("/detect-and-save", upload.single("image"), detectAndSave);

export default router;

