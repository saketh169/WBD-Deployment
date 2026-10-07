const mongoose = require("mongoose");
const { User, UserAuth } = require("../../models/userModel");

/**
 * Resolves patient user profile and ID seamlessly across User and UserAuth collections
 * Solves the issue where authenticated JWT userId belongs to UserAuth instead of User
 */
async function resolvePatientProfile(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return { user: null, userId: null, authId: null };
  }

  // 1. Direct User lookup
  const userDirect = await User.findById(userId).lean();
  if (userDirect) {
    const authDirect = await UserAuth.findOne({ roleId: userDirect._id })
      .select("_id")
      .lean();
    return {
      user: userDirect,
      userId: userDirect._id,
      authId: authDirect?._id || null,
    };
  }

  // 2. UserAuth lookup via roleId
  const authRecord = await UserAuth.findById(userId).lean();
  if (authRecord?.roleId) {
    const userViaAuth = await User.findById(authRecord.roleId).lean();
    if (userViaAuth) {
      return {
        user: userViaAuth,
        userId: userViaAuth._id,
        authId: authRecord._id,
      };
    }
  }

  return { user: null, userId: null, authId: null };
}

module.exports = {
  resolvePatientProfile,
};
