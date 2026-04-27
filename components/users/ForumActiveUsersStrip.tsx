import type { ComponentProps } from "react";
import { ActiveUsersStripBase } from "./ActiveUsersStripBase";

export function ForumActiveUsersStrip(props: ComponentProps<typeof ActiveUsersStripBase>) {
  return <ActiveUsersStripBase {...props} />;
}
