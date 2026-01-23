import fs from "fs";
import path from "path";
import multer from "multer";

// base upload directory
const baseUploadDir = path.join("src", "uploads");

// ensure folders exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(path.join(baseUploadDir, "resumes"));
ensureDir(path.join(baseUploadDir, "images"));

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "resume") {
      cb(null, path.join(baseUploadDir, "resumes"));
    } else if (file.fieldname === "profileImage") {
      cb(null, path.join(baseUploadDir, "images"));
    } else {
      cb(new Error("Invalid upload field"));
    }
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// file filter
const fileFilter = (req, file, cb) => {
  // resume validation
  if (file.fieldname === "resume") {
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("word")
    ) {
      cb(null, true);
    } else {
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
    cb(new Error("Unsupported file field"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

export default upload;


// import fs from "fs";
// import path from "path";
// import multer from "multer";

// const uploadDir = path.join("src", "uploads");

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: uploadDir,
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });



// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     if (
//       file.mimetype === "application/pdf" ||
//       file.mimetype.includes("word")
//     ) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only PDF or DOCX allowed"));
//     }
//   },
// });

// export default upload;