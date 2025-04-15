import { Router } from "express";
import passport from "passport";
import { z } from "zod";
import { validateRequest, validateRequestBody, validateRequestParams } from "zod-express-middleware";
import {
  getAllStudents,
  handleAddTeacher,
  handleApproveInstitution,
  handleDeleteInstitution,
  handleDeleteTeacher,
  handleDeleteUser,
  handleForgotPassword,
  handleGetAllInstitutions,
  handleGetAllUsers,
  handleGetAuthStatus,
  handleGetTeachers,
  handleLoginUser,
  handleRegisterInstitution,
  handleRegisterStudent,
  handleRegistrationPlatformRegister,
  handleResetPassword,
} from "../controllers/auth.controller.js";
import authorizeRoles from "../middlewares/auth/authorize-roles.js";
import requirePurchase from "../middlewares/stripe/require-purchase.js";

const router = Router();

// route for getting auth status
router.get("/", passport.authenticate("jwt", { session: false }), handleGetAuthStatus);

// login route for users
router.post(
  "/",
  validateRequest({
    body: z.object({
      username: z.string(), // * username or email
      password: z.string().trim().min(6),
    }),
  }),
  handleLoginUser
);

// registration route for institutions
router.post(
  "/register-institution",
  validateRequest({
    body: z.object({
      institutionName: z.string(),
      email: z.string().email(),
      address: z.string(),
      postalCodeAndCity: z.string(),
      province: z.string(),
      phone: z.string(),
      type: z.string(),
      employeeName: z.string(),
      employeePosition: z.string(),
      username: z.string().regex(/^[a-zA-Z0-9_-]+$/),
      userEmail: z.string().email(),
      password: z.string().trim().min(6),
    }),
  }),
  handleRegisterInstitution
);

// register student
router.post(
  "/register-student",
  validateRequestBody(
    z.object({
      name: z.string(),
      email: z.string().email(),
      password: z.string().nonempty().min(6),
      classRef: z.string().optional(),
      inviteRef: z.string().optional(),
    })
  ),
  handleRegisterStudent
);

// send the user email instructions for updating his password (forgot-password route)
router.post("/forgot-password", validateRequest(z.object({ email: z.string() })), handleForgotPassword);

// reset password
router.post(
  "/reset-password",
  validateRequestBody(z.object({ newPassword: z.string().trim().min(6), session: z.string() })),
  handleResetPassword
);

// get all teachers of an institution
router.get(
  "/teacher",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["SCHOOL-ADMIN"]),
  requirePurchase,
  handleGetTeachers
);

// create a teacher
router.post(
  "/teacher",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["SCHOOL-ADMIN"]),
  requirePurchase,
  validateRequestBody(
    z.object({
      name: z.string(),
      email: z.string().email(),
      username: z.string().regex(/^[a-zA-Z0-9_-]+$/),
      password: z.string().trim().min(6),
    })
  ),
  handleAddTeacher
);

// delete a teacher by id
router.delete(
  "/teacher/:teacherId",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["SCHOOL-ADMIN"]),
  requirePurchase,
  validateRequestParams(
    z.object({
      teacherId: z.string(),
    })
  ),
  handleDeleteTeacher
);

// get all users (on the admin end)
router.get("/users", passport.authenticate("jwt", { session: false }), authorizeRoles(["ADMIN"]), handleGetAllUsers);

router.get("/students", passport.authenticate("jwt", { session: false }), authorizeRoles(["ADMIN"]), getAllStudents);

// delete a user by id (on the admin end)
router.post(
  "/users/:userId",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["ADMIN"]),
  validateRequestParams(z.object({ userId: z.string() })),
  handleDeleteUser
);

// get all institutions (on the admin end)
router.get(
  "/institutions",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["ADMIN"]),
  handleGetAllInstitutions
);

router.post(
  "/approve-institution/:institutionId",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["ADMIN"]),
  validateRequestParams(z.object({ institutionId: z.string() })),
  handleApproveInstitution
);

// delete a user by id (on the admin end)
router.post(
  "/institutions/:institutionId",
  passport.authenticate("jwt", { session: false }),
  authorizeRoles(["ADMIN"]),
  validateRequestParams(z.object({ institutionId: z.string() })),
  handleDeleteInstitution
);

router.post(
  "/registration-platform",
  validateRequestBody(
    z.object({
      name: z.string().nonempty(),
      email: z.string().email(),
      password: z.string().nonempty().min(6),
      age: z.string().optional(),
      selectedProducts: z.array(z.enum(["check2learn", "vocab21"])),
    })
  ),
  handleRegistrationPlatformRegister
);

export default router;
