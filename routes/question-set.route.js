import { Router } from "express";
import { z } from "zod";
import { validateRequest, validateRequestBody, validateRequestParams } from "zod-express-middleware";
import * as controller from "../controllers/question-set.controller.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";
import requirePurchase from "../middlewares/stripe/require-purchase.js";
import { questionSchema } from "../models/question.model.js";

const router = Router();

// get all question sets
router.get("/", authenticateUser, requirePurchase, controller.handleGetQuestionSets);

// create a new question set
router.post(
  "/",
  authenticateUser,
  requirePurchase,
  validateRequestBody(z.object({ name: z.string() })),
  controller.handleCreateQuestionSet
);

// edit a question set
router.put(
  "/",
  authenticateUser,
  requirePurchase,
  validateRequestBody(z.object({ name: z.string(), questionSetId: z.string() })),
  controller.handleEditQuestionSet
);

// delete a question set
router.delete(
  "/:questionSetId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ questionSetId: z.string() })),
  controller.handleDeleteQuestionSet
);

// get all the questions under question set
router.get(
  "/questions/:questionSetId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ questionSetId: z.string() })),
  controller.handleGetQuestions
);

router.get(
  "/question/:questionId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ questionId: z.string() })),
  controller.handleGetQuestionById
);

// add question to a question set
router.post(
  "/questions/:questionSetId",
  authenticateUser,
  requirePurchase,
  validateRequest({
    params: z.object({
      questionSetId: z.string(),
    }),
    body: questionSchema,
  }),
  controller.handleAddQuestion
);

router.post(
  "/import/:questionSetId/:targetQuestionSetId",
  authenticateUser,
  requirePurchase,
  controller.handleImportQuestions
);

// update a question
router.put(
  "/questions",
  authenticateUser,
  requirePurchase,
  validateRequestBody(questionSchema.extend({ questionId: z.string(), isComplementary: z.boolean().optional() })),
  controller.handleEditQuestion
);

// remove and delete a question under question set
router.delete(
  "/questions/:questionId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ questionId: z.string() })),
  controller.handleDeleteQuestion
);

// remove a complementary question under question set -> question
router.delete(
  "/questions/complementary/:questionId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ questionId: z.string() })),
  controller.handleDeleteComplementaryQuestion
);

// get settings of a question set
router.get("/settings/:questionSetId", authenticateUser, requirePurchase, controller.handleGetQuestionSetConfig);

// update settings of a question set
router.put("/settings/:questionSetId", authenticateUser, requirePurchase, controller.handleEditQuestionSetConfig);

export default router;
