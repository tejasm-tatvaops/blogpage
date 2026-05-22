import { redirect } from "next/navigation";

/** Admin entry — bookmark /admin directly; not linked from public chrome. */
export default function AdminIndexPage() {
  redirect("/admin/login");
}
