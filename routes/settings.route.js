import { Router } from "express";
import passport from "passport";
import { validateRequestBody } from "zod-express-middleware";
import { handleGetSettings, handleSaveSettings } from "../controllers/settings.controller.js";
import authorizeRoles from "../middlewares/auth/authorize-roles.js";
import settings from "../utils/settings.cjs";

const router = Router();

router.get("/", passport.authenticate("jwt", { session: false }), authorizeRoles(["ADMIN"]), handleGetSettings);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["ADMIN"]),
  validateRequestBody(settings.settingsSchema),
  handleSaveSettings
);

export default router;
