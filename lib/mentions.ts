import { AuthUserModel } from "@/models/User";
import { UserProfileModel } from "@/models/UserProfile";
import { createNotification } from "@/lib/notificationService";
import { connectToDatabase } from "@/lib/mongodb";

const MENTION_REGEX = /(^|\s)@([a-zA-Z0-9._-]{2,32})/g;

export const extractMentions = (text: string): string[] => {
  const normalized = String(text ?? "");
  const mentions = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(normalized)) !== null) {
    const username = String(match[2] ?? "").trim().toLowerCase();
    if (username) mentions.add(username);
  }
  return [...mentions];
};

export const notifyMentionedUsers = async (input: {
  content: string;
  actorIdentityKey: string;
  postId: string;
  commentId: string;
  actorDisplayName: string;
}): Promise<void> => {
  const usernames = extractMentions(input.content);
  if (usernames.length === 0) return;

  await connectToDatabase();
  const users = await AuthUserModel.find({ username: { $in: usernames } })
    .select("_id username")
    .lean();
  const recipients = new Set<string>(users.map((u) => `google:${u._id.toString()}`));

  const unresolved = usernames.filter(
    (name) => !users.some((u) => String(u.username ?? "").toLowerCase() === name),
  );

  if (unresolved.length > 0) {
    const escaped = unresolved.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const aliasRegex = new RegExp(`^(${escaped.join("|")})$`, "i");
    const profileMatches = await UserProfileModel.find({
      identity_key: { $regex: /^google:/ },
      display_name: { $regex: aliasRegex },
    })
      .select("identity_key")
      .lean();
    for (const profile of profileMatches as Array<{ identity_key?: string }>) {
      const key = String(profile.identity_key ?? "");
      if (key.startsWith("google:")) recipients.add(key);
    }
  }

  for (const recipientKey of recipients) {
    if (recipientKey === input.actorIdentityKey) continue;
    await createNotification({
      type: "comment",
      post_id: input.postId,
      comment_id: input.commentId,
      recipient_key: recipientKey,
      message: `${input.actorDisplayName} mentioned you in a comment.`,
    });
  }
};
