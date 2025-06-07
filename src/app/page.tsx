"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AdminLoginModal } from "@/components/auth/admin-login-modal";
import SyncMenu from "@/components/sync/sync-menu";
import ManualSync from "@/components/sync/manual-sync";
import { toast } from "sonner";

export default function HomePage() {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+A to open admin login modal
      if (event.ctrlKey && event.shiftKey && event.key === "A") {
        event.preventDefault();
        setIsAdminModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex flex-col items-center justify-center p-4">
      {/* Sync Menu - positioned top right */}
      <SyncMenu />

      <div className="fixed top-4 left-4 z-10">
        <ManualSync />
      </div>

      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Lifeville Quiz App"
            className="w-32 h-32 mb-1 text-center mx-auto"
          />

          <p className="text-gray-600 font-sans">
            Secure student assessment platform
          </p>
        </div>

        <LoginForm
          onSuccess={() => {}}
          onError={(error) => {
            toast.error("Login failed", {
              description: error,
            });
          }}
        />
      </div>

      {/* Admin Login Modal - triggered by Ctrl+Shift+A */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <div className="fixed flex gap-2 bottom-4 right-4 opacity-100 hover:opacity-50 transition-opacity">
        <p className="text-xs text-gray-400 font-mono">
          Ctrl+Shift+A for Admin
        </p>
      </div>
    </div>
  );
}
