import type { ComponentProps } from "react";
import { ActiveUsersStripBase } from "./ActiveUsersStripBase";

export function BlogActiveUsersStrip(props: ComponentProps<typeof ActiveUsersStripBase>) {
  return <ActiveUsersStripBase {...props} />;
}
