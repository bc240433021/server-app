import { Router } from "express";
import { z } from "zod";
import { validateRequest, validateRequestBody, validateRequestParams } from "zod-express-middleware";
import * as controller from "../controllers/class.controller.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";
import authorizeRoles from "../middlewares/auth/authorize-roles.js";
import requirePurchase from "../middlewares/stripe/require-purchase.js";

const router = Router();

// getting all the classes of the corresponding institution
router.get("/", authenticateUser, requirePurchase, controller.handleGetAllClasses);

// creating a new class
router.post(
  "/",
  authenticateUser,
  requirePurchase,
  validateRequestBody(z.object({ name: z.string(), subject: z.string() })),
  controller.handleCreateClass
);

// deleting a class
router.delete(
  "/:classId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ classId: z.string() })),
  controller.handleDeleteClass
);

// get class by id
router.get(
  "/:classId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ classId: z.string() })),
  controller.handleGetClassById
);

router.post(
  "/create-invitation/:classId",
  authenticateUser,
  requirePurchase,
  validateRequest({
    params: z.object({ classId: z.string() }),
    body: z.object({ emails: z.string().email().array(), selectedProducts: z.string().array().optional() }),
  }),
  controller.handleCreateInvitation
);

router.get(
  "/inviter-class-info/:inviteId",
  validateRequestParams(z.object({ inviteId: z.string() })),
  controller.handleGetInviterClass
);

router.delete(
  "/remove-student/:classId/:studentId",
  authenticateUser,
  requirePurchase,
  validateRequestParams(z.object({ studentId: z.string(), classId: z.string() })),
  controller.handleRemoveStudentFromClass
);

// get all the classes where the student is included
router.get("/student/all", authenticateUser, requirePurchase, controller.handleGetStudentClasses);

// send emails to all students in a class
router.post(
  "/send-email/:classId",
  authenticateUser,
  requirePurchase,
  validateRequest({
    params: z.object({ classId: z.string().nonempty() }),
    body: z.object({ subject: z.string().nonempty(), message: z.string().nonempty() }),
  }),
  controller.handleSendEmail
);

router.post(
  "/assign/:classId",
  authenticateUser,
  authorizeRoles(["SCHOOL-ADMIN"]),
  requirePurchase,
  validateRequest({
    params: z.object({ classId: z.string().nonempty() }),
    body: z.object({ teacherId: z.string().nonempty() }),
  }),
  controller.handleAssignTeacher
);

export default router;
