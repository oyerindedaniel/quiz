import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Admin Dashboard",
  description: "System settings and configuration",
};

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-sans">Settings</h1>
        <p className="text-gray-600 font-sans mt-1">
          System configuration and preferences
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 font-sans mb-2">
            Coming Soon
          </h2>
          <p className="text-gray-600 font-sans">
            Settings interface is under development.
          </p>
        </div>
      </div>
    </div>
  );
}
