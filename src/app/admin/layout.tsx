import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { canManageContent } from "@/lib/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");

  const allowed = await canManageContent(session.user.id);
  if (!allowed) redirect("/");

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[#f7f5f0]">
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-6 py-4">
        <Link href="/admin" className="text-lg font-bold">
          פאנל ניהול - עודד המנקד
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="opacity-70 hover:opacity-100">
            יעדים
          </Link>
          <Link href="/admin/subscriptions" className="opacity-70 hover:opacity-100">
            מנויים
          </Link>
          <Link href="/" className="opacity-70 hover:opacity-100">
            לאתר
          </Link>
        </nav>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
