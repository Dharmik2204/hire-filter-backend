import { User } from "../models/users.models.js";

/* ================= USER ================= */

export const findUserByEmail = (email) => {
  return User.findOne({ email });
};


export const findUserById = (id) => {
  return User.findById(id);
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
