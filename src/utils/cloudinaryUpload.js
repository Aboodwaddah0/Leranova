import { configureCloudinary } from "./cloudinary.js";

const mapUploadResult = (result) => ({
  url: result.secure_url,
  public_id: result.public_id,
  resource_type: result.resource_type,
  bytes: result.bytes,
  format: result.format,
});

export const uploadFileToCloudinary = async (filePath, options = {}) => {
  const client = configureCloudinary();

  const result = await client.uploader.upload(filePath, {
    resource_type: "auto",
    ...options,
  });

  return mapUploadResult(result);
};

export const uploadBufferToCloudinary = async (fileBuffer, options = {}) => {
  const client = configureCloudinary();

  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error("Expected file buffer for Cloudinary upload");
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        resource_type: "auto",
        ...options,
      },
      (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      }
    );

    uploadStream.end(fileBuffer);
  });

  return mapUploadResult(result);
};

export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) {
    return;
  }

  const client = configureCloudinary();

  await client.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: "upload",
  });
};