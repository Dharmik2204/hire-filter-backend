import mongoose from "mongoose";
import { User } from "../models/users.models.js";

/* ================= USER ================= */

export const findUserByEmail = (email) => {
  return User.findOne({ email });
};

export const findUserByPhone = (phone) => {
  return User.findOne({ phone });
};

export const findUserByIdentifier = (identifier) => {
  return User.findOne({
    $or: [{ email: identifier }, { phone: identifier }]
  });
};

export const findUserById = (id) => {
  return User.findOne({ _id: id });
};

export const incrementProfileVisits = (userId) => {
  return User.findByIdAndUpdate(userId, { $inc: { profileVisits: 1 } }, { new: true });
};

export const createUser = (data) => {
  return User.create(data);
};

export const updateUser = (id, data) => {
  return User.findByIdAndUpdate(
    id,
    data,
    { new: true }
  );
};

export const deleteUser = (id) => {
  return User.deleteOne({ _id: id });
};

export const findAllUsersAndHrs = () => {
  return User.find({ role: { $in: ["user", "hr"] } }).select("-password");
};

export const getUserGrowthStats = async () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = currentMonthStart;

  const stats = await User.aggregate([
    {
      $match: { role: { $in: ["user", "hr"] } }
    },
    {
      $facet: {
        totalUsers: [
          { $match: { role: "user" } },
          { $count: "count" }
        ],
        totalHrs: [
          { $match: { role: "hr" } },
          { $count: "count" }
        ],
        usersCurrentMonth: [
          { $match: { role: "user", createdAt: { $gte: currentMonthStart } } },
          { $count: "count" }
        ],
        hrsCurrentMonth: [
          { $match: { role: "hr", createdAt: { $gte: currentMonthStart } } },
          { $count: "count" }
        ],
        usersLastMonth: [
          { $match: { role: "user", createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
          { $count: "count" }
        ],
        hrsLastMonth: [
          { $match: { role: "hr", createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
          { $count: "count" }
        ]
      }
    }
  ]);

  return {
    totalUsers: stats[0].totalUsers[0]?.count || 0,
    totalHrs: stats[0].totalHrs[0]?.count || 0,
    usersCurrentMonth: stats[0].usersCurrentMonth[0]?.count || 0,
    hrsCurrentMonth: stats[0].hrsCurrentMonth[0]?.count || 0,
    usersLastMonth: stats[0].usersLastMonth[0]?.count || 0,
    hrsLastMonth: stats[0].hrsLastMonth[0]?.count || 0,
  };
};

export const findUsersByRoles = (roles = [], { excludeUserIds = [], isActiveOnly = true } = {}) => {
  const query = {
    role: { $in: roles },
  };

  if (isActiveOnly) {
    query.isActive = true;
  }

  if (excludeUserIds.length > 0) {
    query._id = { $nin: excludeUserIds };
  }

  return User.find(query).select("_id name role");
};

/* ================= TOKEN ================= */

export const findUserByIdAndToken = (id, token) => {
  return User.findOne({ _id: id, token }).select("-password");
};

export const updateUserToken = (userId, token) => {
  return User.findByIdAndUpdate(
    userId,
    { token },
    { new: true }
  );
};

/* ================= OTP ================= */

// Save OTP (reset attempts)
export const saveOTP = (userId, otp, otpExpiry) => {
  return User.findByIdAndUpdate(
    userId,
    {
      otp,
      otpExpiry,
      otpAttempts: 0
    },
    { new: true }
  );
};

// Increase wrong OTP attempts
export const incrementOtpAttempts = (userId) => {
  return User.findByIdAndUpdate(
    userId,
    { $inc: { otpAttempts: 1 } },
    { new: true }
  );
};

// Clear OTP only (expired / max attempts)
export const clearOTP = (userId) => {
  return User.findByIdAndUpdate(
    userId,
    {
      otp: null,
      otpExpiry: null,
      otpAttempts: 0
    },
    { new: true }
  );
};

// Clear OTP + update password (success)
export const clearOTPAndUpdatePassword = (userId, hashedPassword) => {
  return User.findByIdAndUpdate(
    userId,
    {
      password: hashedPassword,
      otp: null,
      otpExpiry: null,
      otpAttempts: 0
    },
    { new: true }
  );
};

/* ================= SEARCH FOR MESSAGING ================= */

export const searchUsersForMessaging = async (query, currentUserId) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(query);

  const searchQuery = {
    _id: { $ne: currentUserId },
    $or: [
      { name: { $regex: query, $options: "i" } },
      { "company.name": { $regex: query, $options: "i" } }
    ]
  };

  if (isObjectId) {
    searchQuery.$or.push({ _id: query });
  }

  return User.find(searchQuery)
    .select("name email role profile.image company.name")
    .limit(20);
};
