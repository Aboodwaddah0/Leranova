import multer from "multer";

const EXCEL_MIME_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const createUploader = ({ allowedMimeTypes, maxFileSizeInBytes, storage }) => {
  return multer({
    storage,
    limits: {
      fileSize: maxFileSizeInBytes,
    },
    fileFilter: (req, file, callback) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        callback(new Error("Only Excel files (.xls, .xlsx) are allowed"));
        return;
      }

      callback(null, true);
    },
  });
};

export const excelUpload = createUploader({
  allowedMimeTypes: EXCEL_MIME_TYPES,
  maxFileSizeInBytes: 5 * 1024 * 1024,
  storage: multer.memoryStorage(),
}).single("file");

export { createUploader };