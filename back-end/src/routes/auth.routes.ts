import { Router } from "express";
import {
  login,
  me,
  refreshAccessToken,
  signup,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", me);
router.post("/refresh", refreshAccessToken);

export default router;
