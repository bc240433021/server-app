import { Router } from "express";
import passport from "passport";
import { z } from "zod";
import { validateRequestBody } from "zod-express-middleware";
import {
  handleCreateRegistrationPlatformPurchaseSession,
  handleCreateSubscription,
  handleGetPaymentStatus,
  handleGetProductPricing,
  webhookHandler,
} from "../controllers/stripe.controller.js";
import authorizeRoles from "../middlewares/auth/authorize-roles.js";

const router = Router();

// get payment status
router.get("/", passport.authenticate("jwt", { session: false }), handleGetPaymentStatus);

// get product pricing
router.get("/pricing", passport.authenticate("jwt", { session: false }), handleGetProductPricing);

// create subscription
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["SCHOOL-ADMIN", "STUDENT"]),
  validateRequestBody(
    z.object({
      userId: z.string().nonempty(),
      priceId: z.string().optional(),
    })
  ),
  handleCreateSubscription
);

router.post("/registration-platform-purchase-session", handleCreateRegistrationPlatformPurchaseSession);

router.post("/webhook", webhookHandler);

export default router;
