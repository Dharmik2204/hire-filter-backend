import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // RESUME
    if (file.fieldname === "resume") {
      return {
        folder: "resumes",
        resource_type: "raw", // important for pdf/doc
        public_id: `resume-${Date.now()}-${file.originalname}`,
      };
    }

    // PROFILE IMAGE
    if (file.fieldname === "profileImage") {
      return {
        folder: "profile-images",
        resource_type: "image",
        public_id: `profile-${Date.now()}-${file.originalname}`,
      };
    }

    throw new Error("Invalid upload field");
  },
});

const fileFilter = (req, file, cb) => {
  // file filter (same logic as your local)
  console.log("Multer fileFilter processing:", file.originalname, file.mimetype, file.fieldname);
  // resume validation
  if (file.fieldname === "resume") {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("word")
    ) {
      console.log("Resume file accepted");
      cb(null, true);
    } else {
      console.warn("Resume file rejected: Invalid MIME type", file.mimetype);
      cb(new Error("Only PDF or DOC/DOCX allowed for resume"));
    }
  }

  // image validation
  else if (file.fieldname === "profileImage") {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/png" ||
      file.mimetype === "image/webp"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP images allowed"));
    }
  }

  else {
    console.warn("Unsupported file field:", file.fieldname);
    cb(new Error("Unsupported file field"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (same as before)
  },
  fileFilter,
});

export default upload;
