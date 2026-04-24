import { connectToDatabase } from "@/lib/db/mongodb";
import { UserProfileModel } from "@/models/UserProfile";
import { EMAIL_REGEX, PHONE_REGEX, USERNAME_REGEX } from "@/lib/validators/user.validator";

export class UsernameValidationError extends Error {}
export class UsernameConflictError extends Error {}
export class ProfileValidationError extends Error {}

const normalizeUsername = (username: string) => username.trim();

export async function updateUsername(identityKey: string, username: string): Promise<string> {
  await connectToDatabase();
  const safeIdentityKey = String(identityKey ?? "").trim();
  const safeUsername = normalizeUsername(username);
  const safeUsernameLower = safeUsername.toLowerCase();

  if (!safeIdentityKey) {
    throw new UsernameValidationError("Identity key is required.");
  }
  if (!USERNAME_REGEX.test(safeUsername)) {
    throw new UsernameValidationError(
      "Username must be 3-30 chars and use only letters, numbers, or underscores.",
    );
  }

  const current = await UserProfileModel.findOne({ identity_key: safeIdentityKey })
    .select("username username_lower")
    .lean();
  if (!current) throw new UsernameValidationError("Profile not found.");

  if (String(current.username_lower ?? "") === safeUsernameLower) {
    return String(current.username ?? safeUsername);
  }

  const taken = await UserProfileModel.findOne({
    identity_key: { $ne: safeIdentityKey },
    username_lower: safeUsernameLower,
  })
    .select("_id")
    .lean();
  if (taken?._id) {
    throw new UsernameConflictError("Username already taken.");
  }

  try {
    await UserProfileModel.updateOne(
      { identity_key: safeIdentityKey },
      { $set: { username: safeUsername, username_lower: safeUsernameLower } },
    );
  } catch (error) {
    const maybeMongo = error as { code?: number };
    if (maybeMongo?.code === 11000) {
      throw new UsernameConflictError("Username already taken.");
    }
    throw error;
  }

  return safeUsername;
}

export type UpdateUserProfileInput = {
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  email?: string;
  phone?: string;
};

export type OwnPrivateProfile = {
  username: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  email: string | null;
  email_verified: boolean;
  phone: string | null;
  phone_verified: boolean;
};

const normalizeOptional = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
};

export async function getOwnPrivateProfile(identityKey: string): Promise<OwnPrivateProfile | null> {
  await connectToDatabase();
  const safeIdentityKey = String(identityKey ?? "").trim();
  if (!safeIdentityKey) return null;
  const profile = await UserProfileModel.findOne({ identity_key: safeIdentityKey })
    .select("username bio location website email email_verified phone phone_verified")
    .lean();
  if (!profile) return null;
  return {
    username: normalizeOptional((profile as { username?: string | null }).username),
    bio: normalizeOptional((profile as { bio?: string | null }).bio),
    location: normalizeOptional((profile as { location?: string | null }).location),
    website: normalizeOptional((profile as { website?: string | null }).website),
    email: normalizeOptional((profile as { email?: string | null }).email),
    email_verified: Boolean((profile as { email_verified?: boolean }).email_verified),
    phone: normalizeOptional((profile as { phone?: string | null }).phone),
    phone_verified: Boolean((profile as { phone_verified?: boolean }).phone_verified),
  };
}

export async function updateUserProfile(
  identityKey: string,
  data: UpdateUserProfileInput,
): Promise<OwnPrivateProfile> {
  await connectToDatabase();
  const safeIdentityKey = String(identityKey ?? "").trim();
  if (!safeIdentityKey) throw new ProfileValidationError("Identity key is required.");

  const current = await UserProfileModel.findOne({ identity_key: safeIdentityKey })
    .select("username username_lower email email_lower phone")
    .lean();
  if (!current) throw new ProfileValidationError("Profile not found.");

  const updateSet: Record<string, string | boolean | null> = {};

  if (Object.prototype.hasOwnProperty.call(data, "username")) {
    const raw = String(data.username ?? "").trim();
    const currentUsername = String((current as { username?: string | null }).username ?? "").trim();
    if (!raw && currentUsername) {
      throw new ProfileValidationError("Username cannot be cleared once set.");
    }
    if (raw) {
      if (!USERNAME_REGEX.test(raw)) {
        throw new ProfileValidationError(
          "Username must be 3-30 chars and use only letters, numbers, or underscores.",
        );
      }
      const lower = raw.toLowerCase();
      if (lower !== String((current as { username_lower?: string | null }).username_lower ?? "")) {
        const taken = await UserProfileModel.findOne({
          identity_key: { $ne: safeIdentityKey },
          username_lower: lower,
        })
          .select("_id")
          .lean();
        if (taken?._id) throw new UsernameConflictError("Username already taken.");
      }
      updateSet.username = raw;
      updateSet.username_lower = lower;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "bio")) {
    const bio = normalizeOptional(data.bio);
    if (bio && bio.length > 200) throw new ProfileValidationError("Bio must be 200 chars or less.");
    updateSet.bio = bio;
  }
  if (Object.prototype.hasOwnProperty.call(data, "location")) {
    const location = normalizeOptional(data.location);
    if (location && location.length > 120) throw new ProfileValidationError("Location is too long.");
    updateSet.location = location;
  }
  if (Object.prototype.hasOwnProperty.call(data, "website")) {
    const website = normalizeOptional(data.website);
    if (website && website.length > 280) throw new ProfileValidationError("Website is too long.");
    if (website) {
      try {
        const parsed = new URL(website.startsWith("http://") || website.startsWith("https://") ? website : `https://${website}`);
        updateSet.website = parsed.toString();
      } catch {
        throw new ProfileValidationError("Website must be a valid URL.");
      }
    } else {
      updateSet.website = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "email")) {
    const email = normalizeOptional(data.email);
    if (email) {
      const normalizedEmail = email.toLowerCase();
      if (!EMAIL_REGEX.test(email)) throw new ProfileValidationError("Email format is invalid.");
      if (normalizedEmail !== String((current as { email_lower?: string | null }).email_lower ?? "")) {
        const taken = await UserProfileModel.findOne({
          identity_key: { $ne: safeIdentityKey },
          email_lower: normalizedEmail,
        })
          .select("_id")
          .lean();
        if (taken?._id) throw new UsernameConflictError("Email already in use.");
        updateSet.email_verified = false;
      }
      updateSet.email = email;
      updateSet.email_lower = normalizedEmail;
    } else {
      updateSet.email = null;
      updateSet.email_lower = null;
      updateSet.email_verified = false;
    }
  }

  if (Object.prototype.hasOwnProperty.call(data, "phone")) {
    const phone = normalizeOptional(data.phone);
    if (phone) {
      const normalized = phone.replace(/\s+/g, "");
      if (!PHONE_REGEX.test(normalized)) {
        throw new ProfileValidationError("Phone must be 10-15 digits (optional leading +).");
      }
      if (normalized !== String((current as { phone?: string | null }).phone ?? "")) {
        updateSet.phone_verified = false;
      }
      updateSet.phone = normalized;
    } else {
      updateSet.phone = null;
      updateSet.phone_verified = false;
    }
  }

  try {
    if (Object.keys(updateSet).length > 0) {
      await UserProfileModel.updateOne({ identity_key: safeIdentityKey }, { $set: updateSet });
    }
  } catch (error) {
    const maybeMongo = error as { code?: number };
    if (maybeMongo?.code === 11000) {
      throw new UsernameConflictError("Username or email already in use.");
    }
    throw error;
  }

  const refreshed = await getOwnPrivateProfile(safeIdentityKey);
  if (!refreshed) throw new ProfileValidationError("Profile not found.");
  return refreshed;
}
