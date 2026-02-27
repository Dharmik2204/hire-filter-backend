export const formatUserResponse = (user) => {
    if (!user) return null;

    // Convert to plain object if it's a Mongoose document
    const userObj = user.toObject ? user.toObject() : { ...user };

    // 1. Remove Sensitive Fields Globally
    delete userObj.password;
    delete userObj.otp;
    delete userObj.otpExpiry;
    delete userObj.otpAttempts;

    // 2. Role-Based Filtering
    if (userObj.role === "user") {
        // Candidate Profile: Keep 'profile', Remove 'company'
        delete userObj.company;
    } else if (userObj.role === "hr" || userObj.role === "admin") {
        // HR/Admin Profile: Keep 'company', Filter 'profile'
        if (userObj.profile) {
            const filteredProfile = {};
            // Keep only non-candidate fields in profile (like avatar)
            if (userObj.profile.image) {
                filteredProfile.image = userObj.profile.image;
            }
            if (userObj.profile.coverImage) {
                filteredProfile.coverImage = userObj.profile.coverImage;
            }
            userObj.profile = filteredProfile;
        }
    }

    return userObj;
};
