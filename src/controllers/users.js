import fs from "fs";

import {
  findUserById,
  updateUser,
  deleteUser,
} from "../repositories/user.repository.js";


/* ================= GET PROFILE ================= */
export const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("error: ", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= UPDATE PROFILE ================= */
export const updateProfile = async (req, res) => {
  try {
    const updateData = {};

    /* BASIC FIELDS */
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.phone) updateData.phone = req.body.phone;

    /* PROFILE (NESTED SAFE UPDATE) */
    if (req.body.profile && typeof req.body.profile === "object") {
      Object.keys(req.body.profile).forEach((key) => {
        updateData[`profile.${key}`] = req.body.profile[key];
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    const updatedProfile = await updateUser(
      req.user._id,
      { $set: updateData }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedProfile);

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= DELETE PROFILE ================= */
export const deleteProfile = async (req, res) => {
  try {
    const user = await deleteUser(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/* ===============uploadResume==========  */

export const uploadResumeController = async (req, res) => {
  try {
    // const job = await getJobById(req.params.jobId);
    // if (!job) {
    //   return res.status(404).json({ message: "Job not found" });
    // }

    if (!req.file) {
      return res.status(400).json({ message: "Resume is required" });
    }

    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    /* 🔥 DELETE OLD RESUME */
    if (
      user.profile?.resume &&
      fs.existsSync(user.profile.resume)
    ) {
      fs.unlinkSync(user.profile.resume);
    }

    /* 📄 PARSE PDF */
    // const buffer = fs.readFileSync(req.file.path);
    // const pdfData = await pdf(buffer);

    // const skills = extractSkillsFromText(
    //   pdfData.text,
    //   job.requiredSkills
    // );

    /* ✅ UPDATE NESTED FIELDS CORRECTLY */
    await updateUser(user._id, {
      $set: {
        "profile.resume": req.file.path,
        // "profile.skills": skills,
      },
    });

    res.status(200).json({
      success: true,
      message: "Resume upload",
      // resume: updatedUser.profile.resume,
      // skills: updatedUser.profile.skills
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Resume processing failed" });
  }
};

export const uploadProfileImageController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Profile image is required" });
    }

    const user = await findUserById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    /* 🔥 DELETE OLD IMAGE */
    if (
      user.profile?.image &&
      fs.existsSync(user.profile.image)
    ) {
      fs.unlinkSync(user.profile.image);
    }

    /* ✅ UPDATE USER IMAGE */
    const updatedUser = await updateUser(user._id, {
      $set: {
        "profile.image": req.file.path,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      image: updatedUser.profile.image,
    });

  } catch (error) {
    console.error("Profile image upload error:", error);

    // safety cleanup (if DB fails)
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Profile image upload failed",
    });
  }
};