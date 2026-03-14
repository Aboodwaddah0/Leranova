import { generateUsers,addUser,getAllUsers,updateUser,deleteUser } from "../services/userService.js";
import { readExcelFile } from "../utils/readExcelFile.js";
import { validateAddUserData, validateExcelData } from "../validations/userValidation.js";
import prisma from "../utils/prisma.js";
import { deleteFromCloudinary, uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

const buildDomainFromName = (name) => {
  const sanitized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9.-]/g, "");

  if (!sanitized) {
    return null;
  }

  return sanitized.includes(".") ? sanitized : `${sanitized}.com`;
};

export const generateUsersFromExcel = async (req, res) => {
  let uploadedFile = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an Excel file",
      });
    }

    uploadedFile = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "learnova/users/excel",
      resource_type: "raw",
    });

    const data = readExcelFile(req.file.buffer);

    if (!data.length) {
      return res.status(400).json({
        message: "Excel file is empty",
      });
    }

    const organizationId = req.user?.id;

    const { errors, validatedRows } = validateExcelData(data);

    if (errors.length > 0) {
      await deleteFromCloudinary(uploadedFile.public_id, uploadedFile.resource_type);

      return res.status(422).json({
        message: "Excel validation failed",
        errors,
      });
    }

    // Inject orgId from token for STUDENT rows
    const rowsWithOrg = validatedRows.map((row) =>
      row.role === 'STUDENT' ? { ...row, orgId: organizationId } : row
    );
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { Name: true },
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found",
      });
    }

    const domain = buildDomainFromName(organization.Name);

    if (!domain) {
      return res.status(400).json({
        message: "Unable to derive a valid domain from organization name",
      });
    }

    const users = await generateUsers(rowsWithOrg, domain);

    return res.status(201).json({
      message: "Users created successfully",
      total: users.length,
      file: {
        url: uploadedFile.url,
        public_id: uploadedFile.public_id,
      },
      users,
    });
  } catch (error) {
    console.error(error);

    if (uploadedFile?.public_id) {
      try {
        await deleteFromCloudinary(uploadedFile.public_id, uploadedFile.resource_type);
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError.message);
      }
    }

    if (error.message === "Cloudinary environment variables are missing") {
      return res.status(500).json({
        message: "Cloudinary is not configured correctly",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};



export const  addUserController=async (req,res)=>{
  try {
const bodyWithOrg = { ...req.body, orgId: req.user?.id };
const { errors, validatedData } = validateAddUserData(bodyWithOrg);

if (errors.length > 0) {
  return res.status(422).json({
    message: "Validation failed",
    errors,
  });
}

const result=await addUser(validatedData);
 return res.status(201).json({
      message: 'Add new User successfully',
      data: result,
    });
  }catch (error) {
   if (error.message === "user email already exists") {
    return res.status(409).json({ message: error.message });
   }

   return res.status(500).json({message:"Server Error", error: error.message})
  }
 
}

export const getAllUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({
      message: 'Users retrieved successfully',
      total: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const updateUserController = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const updated = await updateUser(id, req.body);
    return res.status(200).json({
      message: 'User updated successfully',
      data: updated,
    });
  } catch (error) {
    if (error.message === 'user not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'user email already exists') {
      return res.status(409).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export const deleteUserController = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    await deleteUser(id);
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.message === 'user not found') {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};