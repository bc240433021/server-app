import { Router } from "express";

import { generateQuestionsHandler } from "../controllers/questions-ai.controller.js";
import { checkAnswerController, getAnalysisbyQuestionId } from "../controllers/questions-analysis.js";
import requirePurchase from "../middlewares/stripe/require-purchase.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";

// 
// questionId, sessionId
const router = Router();

// Route to generate questions using AI
router.post("/generate/:questionSetId",
    authenticateUser,
    // requirePurchase,
    generateQuestionsHandler);

router.get("/:questionId/session/:sessionId",
    // authenticateUser,
    // requirePurchase,
    getAnalysisbyQuestionId);

router.get("/analyze/:questionId/session/:sessionId",
    // authenticateUser,
    // requirePurchase,
    checkAnswerController);


export default router;