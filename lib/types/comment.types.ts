export type CommentWorkflowOutcome = "ok" | "not_found" | "forbidden" | "failed";

export type CommentDomainContext = {
  flow: "comment_create_blog" | "comment_delete_blog" | "comment_create_forum" | "comment_delete_forum";
  identityKey: string;
  slug: string;
  commentId?: string;
};

