import express from "express";
import { register, login } from "../controllers/auth.controller.mjs";

const router = express.Router();
router.post("/auth/register", register);
router.post("/auth/login", login);

export default router;