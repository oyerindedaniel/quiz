import { Metadata } from "next";
import { QuestionsClient } from "@/components/admin/questions-client";

export const metadata: Metadata = {
  title: "Questions - Admin Dashboard",
  description: "Question bank management and editing",
};

export default function QuestionsPage() {
  return <QuestionsClient />;
}
