import { Metadata } from "next";
import { UsersClient } from "@/components/admin/users-client";

export const metadata: Metadata = {
  title: "Users - Admin Dashboard",
  description: "User management and administration",
};

export default function AdminUsersPage() {
  return <UsersClient />;
}
