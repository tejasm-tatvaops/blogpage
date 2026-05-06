import { connectToDatabase } from "@/lib/db/mongodb";
import { UserProfileModel } from "@/models/UserProfile";
import { EMAIL_REGEX, PHONE_REGEX, USERNAME_REGEX } from "@/lib/validators/user.validator";
import {
  EXPERIENCE_LEVELS,
  VERIFICATION_PREFERENCES,
  deriveExpertiseBadge,
  hasProfessionalIdentity,
} from "@/lib/expertiseIdentity";
import { getExpertiseConfig } from "@/lib/expertiseConfigService";

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
  profession?: string | null;
  expertise?: string | null;
  yearsOfExperience?: string | null;
  companyType?: string | null;
  verificationPreference?: string | null;
  publicExpertiseEnabled?: boolean;
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
  profession: string | null;
  expertise: string | null;
  yearsOfExperience: string | null;
  companyType: string | null;
  verificationPreference: string | null;
  publicExpertiseEnabled: boolean;
  expertiseBadge: string | null;
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
    .select("username bio location website email email_verified phone phone_verified profession expertise years_of_experience company_type verification_preference public_expertise_enabled expertise_badge")
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
    profession: normalizeOptional((profile as { profession?: string | null }).profession),
    expertise: normalizeOptional((profile as { expertise?: string | null }).expertise),
    yearsOfExperience: normalizeOptional((profile as { years_of_experience?: string | null }).years_of_experience),
    companyType: normalizeOptional((profile as { company_type?: string | null }).company_type),
    verificationPreference: normalizeOptional((profile as { verification_preference?: string | null }).verification_preference),
    publicExpertiseEnabled: Boolean((profile as { public_expertise_enabled?: boolean }).public_expertise_enabled),
    expertiseBadge: normalizeOptional((profile as { expertise_badge?: string | null }).expertise_badge),
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
    .select("username username_lower email email_lower phone profession expertise years_of_experience company_type verification_preference public_expertise_enabled reputation_score forum_comments blog_comments forum_posts expertise_badge_admin_override")
    .lean();
  if (!current) throw new ProfileValidationError("Profile not found.");
  const expertiseConfig = await getExpertiseConfig();

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

  const normalizeChoice = (value: unknown) => normalizeOptional(value);
  if (Object.prototype.hasOwnProperty.call(data, "profession")) {
    const profession = normalizeChoice(data.profession);
    const currentProfession = normalizeOptional((current as { profession?: string | null }).profession);
    if (profession && !expertiseConfig.professions.includes(profession) && profession !== currentProfession) {
      throw new ProfileValidationError("Invalid profession selected.");
    }
    updateSet.profession = profession;
  }
  if (Object.prototype.hasOwnProperty.call(data, "expertise")) {
    const expertise = normalizeChoice(data.expertise);
    const currentExpertise = normalizeOptional((current as { expertise?: string | null }).expertise);
    if (expertise && !expertiseConfig.expertiseAreas.includes(expertise) && expertise !== currentExpertise) {
      throw new ProfileValidationError("Invalid expertise selected.");
    }
    updateSet.expertise = expertise;
  }
  if (Object.prototype.hasOwnProperty.call(data, "yearsOfExperience")) {
    const years = normalizeChoice(data.yearsOfExperience);
    if (years && !EXPERIENCE_LEVELS.includes(years as (typeof EXPERIENCE_LEVELS)[number])) {
      throw new ProfileValidationError("Invalid experience level selected.");
    }
    updateSet.years_of_experience = years;
  }
  if (Object.prototype.hasOwnProperty.call(data, "companyType")) {
    const companyType = normalizeChoice(data.companyType);
    updateSet.company_type = companyType;
  }
  if (Object.prototype.hasOwnProperty.call(data, "verificationPreference")) {
    const verificationPreference = normalizeChoice(data.verificationPreference) ?? "none";
    if (!VERIFICATION_PREFERENCES.includes(verificationPreference as (typeof VERIFICATION_PREFERENCES)[number])) {
      throw new ProfileValidationError("Invalid verification preference selected.");
    }
    updateSet.verification_preference = verificationPreference;
  }
  if (Object.prototype.hasOwnProperty.call(data, "publicExpertiseEnabled")) {
    const requested = Boolean(data.publicExpertiseEnabled);
    const profession = (updateSet.profession as string | null | undefined) ?? normalizeOptional((current as { profession?: string | null }).profession);
    const expertise = (updateSet.expertise as string | null | undefined) ?? normalizeOptional((current as { expertise?: string | null }).expertise);
    if (requested && !hasProfessionalIdentity({ profession, expertise })) {
      throw new ProfileValidationError("Complete profession and expertise before enabling public expertise.");
    }
    updateSet.public_expertise_enabled = requested;
  }

  const projected = {
    profession:
      (updateSet.profession as string | null | undefined) ??
      normalizeOptional((current as { profession?: string | null }).profession),
    expertise:
      (updateSet.expertise as string | null | undefined) ??
      normalizeOptional((current as { expertise?: string | null }).expertise),
    yearsOfExperience:
      (updateSet.years_of_experience as string | null | undefined) ??
      normalizeOptional((current as { years_of_experience?: string | null }).years_of_experience),
    publicExpertiseEnabled:
      (updateSet.public_expertise_enabled as boolean | undefined) ??
      Boolean((current as { public_expertise_enabled?: boolean }).public_expertise_enabled),
    reputationScore: Number((current as { reputation_score?: number }).reputation_score ?? 0),
    helpfulSignals: Number((current as { forum_comments?: number }).forum_comments ?? 0) +
      Number((current as { blog_comments?: number }).blog_comments ?? 0) +
      Number((current as { forum_posts?: number }).forum_posts ?? 0),
    adminOverrideBadge: normalizeOptional((current as { expertise_badge_admin_override?: string | null }).expertise_badge_admin_override),
  };
  updateSet.expertise_badge = deriveExpertiseBadge(projected);

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
