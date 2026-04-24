export type ReputationEventReason =
  | "article_comment_received"
  | "forum_answer_given"
  | "positive_feedback_received"
  | "content_share"
  | "article_like_received";

export type ReputationOperationResult = {
  awardedPoints: number;
};

