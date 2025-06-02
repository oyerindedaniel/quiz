"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isElectron } from "../lib/utils";
import { LoginForm } from "@/components/auth/login-form";
import { SeedDataPanel } from "@/components/admin/seed-data-panel";
import type { AuthResult } from "@/types";

interface ConnectionStatus {
  sqlite: boolean;
  neon: boolean;
  electron: boolean;
  errors: string[];
}

export default function HomePage() {
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    sqlite: false,
    neon: false,
    electron: false,
    errors: [],
  });
  const [testing, setTesting] = useState(false);

  const testConnections = async () => {
    setTesting(true);
    const newStatus: ConnectionStatus = {
      sqlite: false,
      neon: false,
      electron: isElectron(),
      errors: [],
    };

    console.log("Testing connections");
    console.log(window.electronAPI, typeof window);

    try {
      if (typeof window !== "undefined" && window.electronAPI) {
        try {
          console.log("Checking SQLite integrity");
          const result = await window.electronAPI.database.checkIntegrity();
          newStatus.sqlite = result === true;
        } catch (error) {
          newStatus.errors.push(
            `SQLite: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }

        try {
          const version = await window.electronAPI.app.getVersion();
          console.log("App version:", version);
        } catch (error) {
          newStatus.errors.push(
            `App API: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      } else {
        newStatus.errors.push(
          "Electron API not available (running in browser)"
        );
      }

      if (!isElectron()) {
        newStatus.errors.push("NeonDB testing requires Electron environment");
      }
    } catch (error) {
      newStatus.errors.push(
        `General error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    setStatus(newStatus);
    setTesting(false);
  };

  useEffect(() => {
    setStatus((prev) => ({
      ...prev,
      electron: isElectron(),
    }));
  }, []);

  const handleLoginSuccess = (result: AuthResult) => {
    setAuthResult(result);
    console.log("Login successful:", result);
  };

  const handleLoginError = (error: string) => {
    console.error("Login error:", error);
  };

  const handleLogout = () => {
    setAuthResult(null);
  };

  if (authResult && authResult.success) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-correct-500 px-8 py-6">
                <div className="flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h1 className="text-2xl font-bold text-white">
                    Authentication Successful
                  </h1>
                </div>
                <p className="text-correct-100 text-center mt-2">
                  Ready to begin quiz
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                    <h3 className="font-semibold text-brand-800 mb-3 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Student Information
                    </h3>
                    <div className="space-y-2">
                      <p className="text-brand-700">
                        <span className="font-medium">Name:</span>{" "}
                        {authResult.user?.name}
                      </p>
                      <p className="text-brand-700">
                        <span className="font-medium">Code:</span>{" "}
                        <span className="font-mono">
                          {authResult.user?.studentCode}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-selected-50 rounded-lg p-4 border border-selected-200">
                    <h3 className="font-semibold text-selected-800 mb-3 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      Subject Information
                    </h3>
                    <div className="space-y-2">
                      <p className="text-selected-700">
                        <span className="font-medium">Subject:</span>{" "}
                        {authResult.subject?.name}
                      </p>
                      <p className="text-selected-700">
                        <span className="font-medium">Code:</span>{" "}
                        <span className="font-mono">
                          {authResult.subject?.subjectCode}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {authResult.existingAttempt && (
                  <div className="bg-pending-50 border border-pending-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-pending-600 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <h3 className="font-semibold text-pending-800">
                        Existing Quiz Found
                      </h3>
                    </div>
                    <p className="text-pending-700 mt-2">
                      You have an incomplete quiz that can be resumed.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() =>
                      console.log("Start Quiz - Phase 3 Implementation")
                    }
                    className="flex-1"
                  >
                    {authResult.existingAttempt
                      ? "Resume Quiz"
                      : "Start New Quiz"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleLogout}
                    className="flex-1 sm:flex-none"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
              <TabsTrigger value="login">Student Login</TabsTrigger>
              <TabsTrigger value="admin">Admin Panel</TabsTrigger>
              <TabsTrigger value="testing">System Diagnostics</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
              />
            </TabsContent>

            <TabsContent value="admin">
              <SeedDataPanel />
            </TabsContent>

            <TabsContent value="testing" className="space-y-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Environment Status
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${
                            status.electron
                              ? "bg-correct-500"
                              : "bg-incorrect-500"
                          }`}
                        ></div>
                        <span className="font-medium text-gray-700">
                          Electron
                        </span>
                      </div>
                      <Badge
                        variant={status.electron ? "default" : "destructive"}
                      >
                        {status.electron ? "Active" : "Browser"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${
                            status.sqlite ? "bg-correct-500" : "bg-pending-400"
                          }`}
                        ></div>
                        <span className="font-medium text-gray-700">
                          SQLite
                        </span>
                      </div>
                      <Badge variant={status.sqlite ? "default" : "secondary"}>
                        {status.sqlite ? "Connected" : "Untested"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-3 ${
                            status.neon ? "bg-correct-500" : "bg-pending-400"
                          }`}
                        ></div>
                        <span className="font-medium text-gray-700">
                          NeonDB
                        </span>
                      </div>
                      <Badge variant={status.neon ? "default" : "secondary"}>
                        {status.neon ? "Connected" : "Untested"}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    onClick={testConnections}
                    disabled={testing}
                    className="w-full sm:w-auto"
                  >
                    {testing ? "Testing Connections..." : "Test Connections"}
                  </Button>

                  {status.errors.length > 0 && (
                    <div className="mt-6 p-4 bg-incorrect-50 border border-incorrect-200 rounded-lg">
                      <h3 className="font-semibold text-incorrect-700 mb-2">
                        Issues Found
                      </h3>
                      <ul className="space-y-1">
                        {status.errors.map((error, index) => (
                          <li
                            key={index}
                            className="text-incorrect-600 text-sm"
                          >
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Implementation Status
                  </h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-correct-50 rounded-lg p-6 border border-correct-200">
                      <div className="flex items-center mb-4">
                        <svg
                          className="w-5 h-5 text-correct-600 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <h3 className="font-semibold text-correct-700">
                          Phase 2 Complete
                        </h3>
                      </div>
                      <ul className="text-sm text-correct-600 space-y-2">
                        <li>• Authentication service with PIN validation</li>
                        <li>• Local database operations</li>
                        <li>• User seeding with sample data</li>
                        <li>• Modern login interface</li>
                        <li>• Admin data management</li>
                        <li>• Session management</li>
                        <li>• Design system integration</li>
                      </ul>
                    </div>

                    <div className="bg-pending-50 rounded-lg p-6 border border-pending-200">
                      <div className="flex items-center mb-4">
                        <svg
                          className="w-5 h-5 text-pending-600 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <h3 className="font-semibold text-pending-700">
                          Phase 3 Roadmap
                        </h3>
                      </div>
                      <ul className="text-sm text-pending-600 space-y-2">
                        <li>• Quiz engine implementation</li>
                        <li>• Question display components</li>
                        <li>• Answer tracking and validation</li>
                        <li>• Quiz submission and scoring</li>
                        <li>• Results and analytics display</li>
                        <li>• Progress tracking system</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
