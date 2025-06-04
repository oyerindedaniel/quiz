import { Metadata } from "next";
import { SubjectsClient } from "@/components/admin/subjects-client";

export const metadata: Metadata = {
  title: "Subjects - Admin Dashboard",
  description: "Subject management and configuration",
};

export default function SubjectsPage() {
  return <SubjectsClient />;
}
