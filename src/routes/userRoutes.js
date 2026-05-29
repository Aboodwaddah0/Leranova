import express from "express";
import { isOrganization } from "../middlewares/isOrganization.js"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { excelUpload } from "../middlewares/uploadExcelFileMiddleware.js";
import { generateUsersFromExcel, addUserController, createUserWithGeneratedCredentialsController, getAllUsersController, updateUserController, deleteUserController, exportUsersCredentialsController, linkParentToStudentsController, downloadSampleExcelController } from "../controllers/userController.js";


const router = express.Router();

router.post("/generate-users",authMiddleware,isOrganization, excelUpload, generateUsersFromExcel);
router.post("/generate-user",authMiddleware,isOrganization,createUserWithGeneratedCredentialsController);
router.post("/",authMiddleware,isOrganization,addUserController);
router.get("/",authMiddleware,isOrganization,getAllUsersController);
router.get("/export-credentials",authMiddleware,isOrganization,exportUsersCredentialsController);
router.get("/sample-excel",authMiddleware,isOrganization,downloadSampleExcelController);
router.patch("/parents/:parentId/link-students",authMiddleware,isOrganization,linkParentToStudentsController);
router.put("/:id",authMiddleware,isOrganization,updateUserController);
router.delete("/:id",authMiddleware,isOrganization,deleteUserController);
export default router;



