import { updateUserProfile } from "@/lib/services/user.service";

export async function updateOwnProfileDetails(identityKey: string, input: Parameters<typeof updateUserProfile>[1]) {
  return updateUserProfile(identityKey, input);
}

