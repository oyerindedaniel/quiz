import { AdminLayoutWithSidebar } from "@/components/admin/admin-layout-with-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutWithSidebar>{children}</AdminLayoutWithSidebar>;
}
