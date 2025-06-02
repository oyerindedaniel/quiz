"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserSeedingService } from "@/lib/auth/user-seeding-service";

interface SeedResult {
  created: number;
  skipped: number;
  errors: string[];
}

export function SeedDataPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    users?: SeedResult;
    subjects?: SeedResult;
  } | null>(null);

  const seedingService = new UserSeedingService();

  const handleSeedProductionData = async () => {
    setLoading(true);
    setResults(null);

    try {
      const result = await seedingService.createProductionData();
      setResults(result);
    } catch (error) {
      console.error("Failed to seed data:", error);
      setResults({
        users: { created: 0, skipped: 0, errors: ["Failed to seed users"] },
        subjects: {
          created: 0,
          skipped: 0,
          errors: ["Failed to seed subjects"],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-progress-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Data Management
          </h1>
          <p className="text-gray-600">
            Initialize your quiz system with student and subject data
          </p>
        </div>

        <div className="text-center mb-8">
          <Button
            onClick={handleSeedProductionData}
            disabled={loading}
            size="lg"
            variant="default"
          >
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading Student Data...
              </div>
            ) : (
              <div className="flex items-center">
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Load Student Data
              </div>
            )}
          </Button>
        </div>

        {results && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Students
                  </h3>
                  <Badge variant="default">Users</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-correct-600 mb-1">
                      {results.users?.created || 0}
                    </div>
                    <div className="text-sm text-gray-600">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pending-600 mb-1">
                      {results.users?.skipped || 0}
                    </div>
                    <div className="text-sm text-gray-600">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-incorrect-600 mb-1">
                      {results.users?.errors.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                </div>

                {results.users?.errors && results.users.errors.length > 0 && (
                  <div className="bg-incorrect-50 rounded-lg p-4 border border-incorrect-200">
                    <h4 className="text-sm font-medium text-incorrect-700 mb-2">
                      Error Details
                    </h4>
                    <div className="space-y-1">
                      {results.users.errors.map((error, index) => (
                        <p key={index} className="text-xs text-incorrect-600">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Subjects
                  </h3>
                  <Badge variant="secondary">Courses</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-correct-600 mb-1">
                      {results.subjects?.created || 0}
                    </div>
                    <div className="text-sm text-gray-600">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pending-600 mb-1">
                      {results.subjects?.skipped || 0}
                    </div>
                    <div className="text-sm text-gray-600">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-incorrect-600 mb-1">
                      {results.subjects?.errors.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                </div>

                {results.subjects?.errors &&
                  results.subjects.errors.length > 0 && (
                    <div className="bg-incorrect-50 rounded-lg p-4 border border-incorrect-200">
                      <h4 className="text-sm font-medium text-incorrect-700 mb-2">
                        Error Details
                      </h4>
                      <div className="space-y-1">
                        {results.subjects.errors.map((error, index) => (
                          <p key={index} className="text-xs text-incorrect-600">
                            • {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="bg-brand-50 rounded-xl border border-brand-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Sample Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { student: "STU001", subject: "MATH101", pin: "123456" },
                  { student: "STU002", subject: "ENG201", pin: "234567" },
                  { student: "STU003", subject: "CS101", pin: "345678" },
                ].map((creds, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-brand-200"
                  >
                    <div className="text-center space-y-2">
                      <div className="text-sm font-medium text-gray-700">
                        Test Account {index + 1}
                      </div>
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs block"
                        >
                          {creds.student}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs block"
                        >
                          {creds.subject}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs block tracking-widest"
                        >
                          {creds.pin}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-selected-50 rounded-xl border border-selected-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-selected-500 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Generated Data Overview
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">
                    Students Created
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 5 sample students (STU001-STU005)</li>
                    <li>• Sequential PIN codes starting from 123456</li>
                    <li>• Unique identifiers for testing</li>
                    <li>• Ready for authentication</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">
                    Subjects Created
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• MATH101, ENG201, CS101, PHY101, CHEM101</li>
                    <li>• Standard subject code format</li>
                    <li>• Prevents duplicate entries</li>
                    <li>• Subject-specific configurations</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
