import { v2 as cloudinary } from "cloudinary";

let configured = false;

export const configureCloudinary = () => {
  if (configured) {
    return cloudinary;
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  const cloudName = String(CLOUDINARY_CLOUD_NAME || "");
  const apiKey = String(CLOUDINARY_API_KEY || "");
  const apiSecret = String(CLOUDINARY_API_SECRET || "");

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are missing");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;

  return cloudinary;``
};

export default cloudinary;
