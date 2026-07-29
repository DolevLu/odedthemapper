import { SiteHeader } from "@/components/header/SiteHeader";
import { AppSidebar } from "@/components/AppSidebar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <div className="flex flex-1 flex-col sm:flex-row">
        <AppSidebar currentSlug={null} accessLevel="none" />
        <div className="min-w-0 flex-1 pb-32 sm:pb-0">{children}</div>
      </div>
    </div>
  );
}
