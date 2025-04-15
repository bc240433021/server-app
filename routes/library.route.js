import { Router } from "express";
import {
    createLibraryResource, createLibraryWebResource, getAllLibraryResources, searchLibraryController
} from "../controllers/library.controller.js";
import { uploadMultipleFiles } from "../middlewares/common/uploadFile.js";
import authenticateUser from "../middlewares/auth/authenticate-user.js";

const router = Router();

router.get(
    "/search",
    searchLibraryController
);

router.post(
    "/:classID/resource",
    uploadMultipleFiles("testchecker-question-files"),
    createLibraryResource
);

router.post(
    "/:classID/web-resource",
    createLibraryWebResource
);

router.get(
    "/:classId?",
    getAllLibraryResources
);

export default router;
