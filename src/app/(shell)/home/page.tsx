import { redirect } from "next/navigation";

/** Kept only so old links/bookmarks to /home keep working - the landing page lives at "/" now. */
export default function HomePage() {
  redirect("/");
}
