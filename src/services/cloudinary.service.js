import { configureCloudinary } from '../utils/cloudinary.js';

export const uploadVideo = async (fileBuffer, options = {}) => {
  const client = configureCloudinary();

  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error('Expected file buffer for video upload');
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        resource_type: 'video',
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

  return {
    videoUrl: result.secure_url,
    videoPublicId: result.public_id,
    videoResourceType: result.resource_type,
  };
};

export const deleteVideo = async (publicId, resourceType = 'video') => {
  if (!publicId) {
    return;
  }

  const client = configureCloudinary();

  await client.uploader.destroy(publicId, {
    resource_type: resourceType,
    type: 'upload',
  });
};