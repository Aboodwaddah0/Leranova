import express from "express";
import { isOrganization } from "../middlewares/isOrganization.js"
import { authMiddleware } from "../middlewares/authMiddleware.js"
import { excelUpload } from "../middlewares/uploadExcelFileMiddleware.js";
import { generateUsersFromExcel, addUserController, getAllUsersController, updateUserController, deleteUserController } from "../controllers/userController.js";


const router = express.Router();

router.post("/generate-users",authMiddleware,isOrganization, excelUpload, generateUsersFromExcel);
router.post("/",authMiddleware,isOrganization,addUserController);
router.get("/",authMiddleware,isOrganization,getAllUsersController);
router.put("/:id",authMiddleware,isOrganization,updateUserController);
router.delete("/:id",authMiddleware,isOrganization,deleteUserController);
export default router;