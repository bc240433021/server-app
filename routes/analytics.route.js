import { Router } from "express";
import { z } from "zod";
import { validateRequestBody } from "zod-express-middleware";
import {
  handleAddScreenTime,
  handleGetClassEvaluation,
  handleGetMonthlyTimeSpentReport,
  handleGetStudentEvaluation,
  handleGetWeeklyReport,
} from "../controllers/analytics.controller.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";

const router = Router();

router.post(
  "/add_screen_time",
  authenticateUser,
  validateRequestBody(z.object({ screenTime: z.number(), userId: z.string() })),
  handleAddScreenTime
);

router.get("/weekly_report/:userId", authenticateUser, handleGetWeeklyReport);

router.get("/monthly_time_spent_report/:userId", authenticateUser, handleGetMonthlyTimeSpentReport);

router.get("/student-evaluation/:studentId", authenticateUser, handleGetStudentEvaluation);

router.get("/class-evaluation/:classId", authenticateUser, handleGetClassEvaluation);

export default router;
