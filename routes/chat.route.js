import { Router } from "express";
import { z } from "zod";
import { validateRequest, validateRequestBody, validateRequestParams } from "zod-express-middleware";
import {
  handleFindOrCreateRoom,
  handleGetClassGroupChat,
  handleGetRoomMessages,
  handleSendMessageToRoom as handleSendMessageToClass,
} from "../controllers/chat.controller.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";
import {uploadFile} from "../middlewares/common/uploadFile.js";

const router = Router();

router.post(
  "/",
  validateRequestBody(z.object({ joinerId: z.string(), creatorId: z.string() })),
  authenticateUser,
  handleFindOrCreateRoom
);

router.get(
  "/:roomId",
  validateRequestParams(z.object({ roomId: z.string() })),
  authenticateUser,
  handleGetRoomMessages
);

router.post(
  "/:classId",
  validateRequest({
    params: z.object({ classId: z.string() }),
  }),
  authenticateUser,
  uploadFile("testchecker-message-files"),
  handleSendMessageToClass
);

router.get(
  "/class/:classId",
  validateRequest({
    params: z.object({ classId: z.string() }),
  }),
  authenticateUser,
  handleGetClassGroupChat
);

export default router;
