"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AdminLoginModal } from "@/components/auth/admin-login-modal";
import { Button } from "@/components/ui/button";
import QuestionSync from "@/components/sync/question-sync";
import { toast } from "sonner";

export default function HomePage() {
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+A to open admin login modal
      if (event.ctrlKey && event.shiftKey && event.key === "A") {
        event.preventDefault();
        setIsAdminModalOpen(true);
      }
      // Ctrl+Shift+S to toggle sync panel
      if (event.ctrlKey && event.shiftKey && event.key === "S") {
        event.preventDefault();
        setShowSyncPanel(!showSyncPanel);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSyncPanel]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSyncPanel(!showSyncPanel)}
          className="bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-gray-50 text-gray-700 font-sans"
        >
          <svg
            className="w-3 h-3 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {showSyncPanel ? "Hide Sync" : "Show Sync"}
        </Button>
      </div>

      {showSyncPanel && (
        <div className="fixed top-16 right-4 z-20">
          <QuestionSync />
        </div>
      )}

      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-sans">
            Lifeville Quiz App
          </h1>
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

      <div className="fixed bottom-4 right-4 opacity-10 hover:opacity-50 transition-opacity">
        <p className="text-xs text-gray-400 font-mono">
          Ctrl+Shift+A | Ctrl+Shift+S
        </p>
      </div>
    </div>
  );
}
