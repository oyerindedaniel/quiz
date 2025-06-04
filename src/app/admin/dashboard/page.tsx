import { Metadata } from "next";
import { DashboardClient } from "@/components/admin/dashboard-client";

export const metadata: Metadata = {
  title: "Admin Dashboard - Quiz App",
  description: "Administrative dashboard for quiz management system",
};

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
