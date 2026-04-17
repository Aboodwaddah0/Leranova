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
      const fileName = String(file?.originalname || '').toLowerCase();
      const hasExcelExtension = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const hasAllowedMime = allowedMimeTypes.has(file.mimetype);

      // Some clients send generic MIME types (e.g., application/octet-stream)
      // for valid Excel files, so we accept known Excel extensions as fallback.
      if (!hasAllowedMime && !hasExcelExtension) {
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