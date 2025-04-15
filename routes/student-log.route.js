import { Router } from "express";
import { handleGetStudentLog, handleRecordLog } from "../controllers/student-log.controller.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";

const router = Router();

router.post("/record", authenticateUser, handleRecordLog);

router.get("/get_student_record/:studentId", authenticateUser, handleGetStudentLog);

export default router;
