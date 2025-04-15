import { Router } from "express";
import { checkGrammarController, updateGrammarReviewController } from "../controllers/grammar.controller.js";

import requirePurchase from "../middlewares/stripe/require-purchase.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";


const router = Router();

router.get("/check-grammar/:questionId/session/:sessionId",
    // authenticateUser,
    // requirePurchase,
    checkGrammarController
);

router.put("/:questionId/session/:sessionId",
    // authenticateUser,
    // requirePurchase,
    updateGrammarReviewController
);


export default router