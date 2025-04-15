import { Router } from "express";
import { z } from "zod";
import { validateRequest, validateRequestBody, validateRequestParams } from "zod-express-middleware";
import * as controller from "../controllers/session.controller.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";
import requirePurchase from "../middlewares/stripe/require-purchase.js";

const router = Router();

// getting all the sessions of the corresponding teacher
router.get("/", authenticateUser, requirePurchase, controller.handleGetAllSessions);

// creating a new session
router.post(
  "/",
  authenticateUser,
  requirePurchase,
  validateRequestBody(z.object({ questionSets: z.array(z.string()) })),
  controller.handleCreateSession
);

// edit session
router.put(
  "/edit/:sessionId",
  authenticateUser,
  requirePurchase,
  validateRequest({ params: z.object({ sessionId: z.string() }) }),
  controller.handleEditSession
);

// deleting a session
router.delete(
  "/:sessionId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(
    z.object({
      sessionId: z.string(),
    })
  ),
  controller.handleDeleteSession
);

// get session by session code
router.get(
  "/code/:sessionCode",
  validateRequestParams(
    z.object({
      sessionCode: z.string(),
    })
  ),
  controller.handleGetSessionByCode
);

router.put(
  "/settings/:sessionId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(
    z.object({
      sessionId: z.string(),
    })
  ),
  controller.handleUpdateSessionSettings
);

// end session
router.post(
  "/end/:sessionId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ sessionId: z.string() })),
  controller.handleEndSession
);

// re-activate session
router.post(
  "/reactivate/:sessionId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ sessionId: z.string() })),
  controller.handleReactivateSession
);

// joining a session (for students)
router.post(
  "/join/:code",
  validateRequest({
    body: z.object({ studentId: z.string() }),
    params: z.object({ code: z.string() }),
  }),
  controller.handleJoin
);

// checking if a student has a joined a session or not
router.get(
  "/join-status/:code/:studentId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ code: z.string(), studentId: z.string() })),
  controller.handleGetJoinStatus
);

// getting all the questions of the session (for students)
router.get(
  "/questions/:code",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ code: z.string() })),
  controller.handleGetQuestions
);

// for submitting an answer
router.post(
  "/submit/:code",
  validateRequest({
    params: z.object({
      code: z.string(),
    }),
    body: z.object({
      studentId: z.string(),
      answers: z.array(z.string()),
      questionId: z.string(),
    }),
  }),
  controller.handleSubmitAnswer
);

// reviewing a submission
router.post(
  "/review/:submissionId",
  authenticateUser,
  requirePurchase,
  validateRequest({
    params: z.object({ submissionId: z.string() }),
    body: z.object({ questionId: z.string(), sessionId: z.string(), status: z.enum(["CORRECT", "WRONG"]) }),
  }),
  controller.handleReviewSubmission
);

// for inviting a class in a session
router.post(
  "/invite-class/:sessionId",
  authenticateUser,
  requirePurchase,
  validateRequest({
    params: z.object({ sessionId: z.string() }),
    body: z.object({ classId: z.string() }),
  }),
  controller.handleInviteClass
);

// get all active sessions of the current auth student
router.get("/student/all-active", authenticateUser, requirePurchase, controller.handleGetAllActiveSessionsOfStudent);

// get all the activations sessions
router.get("/student/activation-sessions", authenticateUser, requirePurchase, controller.handleGetActivationSessions);

// Mark the student as he has answered all the question in that session
router.post("/student/done/:sessionId", authenticateUser, requirePurchase, controller.handleDoneStudentSession);

export default router;
