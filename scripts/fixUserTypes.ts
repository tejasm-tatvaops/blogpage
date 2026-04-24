import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserProfileModel } from "@/models/UserProfile";
import { getUserType } from "@/lib/identity";

dotenv.config({ path: ".env.local" });

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(mongoUri);

  const profiles = await UserProfileModel.find({})
    .select("_id identity_key user_type")
    .lean();

  let updated = 0;

  for (const profile of profiles) {
    const identityKey = String(profile.identity_key ?? "").trim();
    if (!identityKey) continue;
    const correctType = getUserType(identityKey);

    if (profile.user_type !== correctType) {
      await UserProfileModel.updateOne(
        { _id: profile._id },
        { $set: { user_type: correctType } },
      );
      updated += 1;
      console.log(`Updated: ${identityKey} -> ${correctType}`);
    }
  }

  console.log(`Done. Updated ${updated} profiles.`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
