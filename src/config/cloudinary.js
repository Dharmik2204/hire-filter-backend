import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Debug check
if (!process.env.CLOUDINARY_API_KEY) {
  console.warn("⚠️ Warning: CLOUDINARY_API_KEY is missing from environment variables!");
}

const cloudConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
};

cloudinary.config(cloudConfig);

// Diagnostic Log
if (process.env.CLOUDINARY_API_SECRET) {
  const secret = process.env.CLOUDINARY_API_SECRET;
  console.log("Cloudinary Initialized. Secret Length:", secret.length);
  // Optional: check for leading/trailing spaces
  if (secret.trim() !== secret) {
    console.warn("⚠️ Warning: CLOUDINARY_API_SECRET has leading or trailing spaces!");
  }
}

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
    return null; 
  }
};

export const deleteFromCloudinary = async (publicId, resourceType = "image", type) => {
  try {
    if (!publicId) return null;
    const options = { resource_type: resourceType };
    if (type) options.type = type;
    await cloudinary.uploader.destroy(publicId, options);
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
  }
};

/**
 * Resolve Cloudinary resource/type info using stored data or a URL.
 * Also extracts version and format (extension) to ensure signed URLs are valid.
 */
export const resolveCloudinaryAssetInfo = (options = {}) => {
  const { resourceType, type, sourceUrl } = options;
  let resolvedResourceType = resourceType;
  let resolvedType = type;
  let version = null;
  let format = null;

  if (sourceUrl) {
    // 1. Resolve Resource Type and Type
    const typeMatch = sourceUrl.match(/\/(image|raw|video)\/(upload|authenticated|private)\//);
    if (!resolvedResourceType && typeMatch?.[1]) resolvedResourceType = typeMatch[1];
    if (!resolvedType && typeMatch?.[2]) resolvedType = typeMatch[2];

    // 2. Resolve Version (v12345678)
    const versionMatch = sourceUrl.match(/\/v(\d+)\//);
    if (versionMatch?.[1]) version = versionMatch[1];

    // 3. Resolve Format/Extension
    const urlParts = sourceUrl.split('?')[0].split('.');
    if (urlParts.length > 1) {
      const ext = urlParts[urlParts.length - 1].toLowerCase();
      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(ext)) {
        format = ext;
      }
    }
  }

  return { 
    resourceType: resolvedResourceType, 
    type: resolvedType,
    version,
    format
  };
};

/**
 * Generates a signed URL for any asset.
 */
export const getSignedUrl = (publicId, options = {}) => {
  try {
    if (!publicId) return null;

    const { resourceType, type, sourceUrl, flags, expiresAt } = options;

    // 1. Resolve Asset Info (Resource Type, Type, Version, Format)
    const resolved = resolveCloudinaryAssetInfo({ resourceType, type, sourceUrl });

    // 2. Identify correct resource_type (Try resolved, fallback to provided, fallback to "image")
    const finalResourceType = resolved.resourceType || resourceType || "image";

    const baseOptions = {
      sign_url: true,
      secure: true,
      resource_type: finalResourceType,
      type: resolved.type || type || "upload",
    };

    if (resolved.version) {
      // Must be a number for some SDK versions to sign correctly
      baseOptions.version = parseInt(resolved.version, 10);
    }
    if (resolved.format) baseOptions.format = resolved.format;
    if (flags) baseOptions.flags = flags;
    if (expiresAt) baseOptions.expires_at = expiresAt;

    const url = cloudinary.url(publicId, {
      ...baseOptions,
      ...cloudConfig
    });

    return url;
  } catch (error) {
    console.error("Cloudinary getSignedUrl error:", error);
    return null;
  }
};

/**
 * Generates both a preview URL and a forced download URL for resumes.
 */
export const getResumeUrls = (publicId, options = {}) => {
  try {
    if (!publicId) return null;

    const { resourceType, type, sourceUrl, expiresAt } = options;
    
    // Use getSignedUrl which handles metadata resolution
    const previewUrl = getSignedUrl(publicId, { 
      resourceType, 
      type, 
      sourceUrl, 
      expiresAt 
    });

    const downloadUrl = getSignedUrl(publicId, { 
      resourceType, 
      type, 
      sourceUrl, 
      expiresAt, 
      flags: "attachment" 
    });

    return { previewUrl, downloadUrl };
  } catch (error) {
    console.error("Cloudinary resume URLs error:", error);
    return null;
  }
};

/**
 * Builds a standardized resume response object.
 */
export const buildResumeResponse = (resume) => {
  if (!resume) return null;

  const resumeObj = resume.toObject ? resume.toObject() : { ...resume };
  const publicId = resumeObj.public_id || null;
  const resourceType = resumeObj.resource_type || null;
  const type = resumeObj.type || null;
  const sourceUrl = resumeObj.url || null;

  let previewUrl = sourceUrl;
  let downloadUrl = null;

  if (publicId) {
    const resumeUrls = getResumeUrls(publicId, {
      resourceType,
      type,
      sourceUrl,
    });
    if (resumeUrls) {
      previewUrl = resumeUrls.previewUrl;
      downloadUrl = resumeUrls.downloadUrl;
    }
  }

  if (!downloadUrl) downloadUrl = previewUrl || null;

  return {
    url: previewUrl || null,
    downloadUrl,
    public_id: publicId,
    resource_type: resourceType,
    type,
  };
};

export default cloudinary;
