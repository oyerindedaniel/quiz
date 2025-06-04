import { Metadata } from "next";
import { AnalyticsClient } from "@/components/admin/analytics-client";

export const metadata: Metadata = {
  title: "Analytics - Admin Dashboard",
  description: "Quiz analytics and reporting",
};

export default function AdminAnalyticsPage() {
  return <AnalyticsClient />;
}
