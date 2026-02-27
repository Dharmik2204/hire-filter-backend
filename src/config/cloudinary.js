import { v2 as cloudinary } from "cloudinary";

import dotenv from "dotenv";
dotenv.config();

// Debug check (will help user see if keys are missing)
if (!process.env.CLOUDINARY_API_KEY) {
  console.warn("⚠️ Warning: CLOUDINARY_API_KEY is missing from environment variables!");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath, folder = "general") => {
  try {
    if (!localFilePath) return null;

    // Upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: folder,
      resource_type: "auto",
    });

    // File has been uploaded successfully
    return response;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return null; // Return null so controller knows to use local fallback
  }
};

export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    if (!publicId) return null;
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
  }
};

export default cloudinary;
