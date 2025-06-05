"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import type { ImportResult } from "@/types/app";

export function ImportClient() {
  const { admin, isLoading } = useAdminAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ipcDb = new IPCDatabaseService();

  const uploadCSV = async (csvContent: string, filename?: string) => {
    if (!admin) {
      setError("You must be logged in to import data");
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      if (filename) {
        const result = await ipcDb.importCSVQuestions(csvContent);
        setUploadResult(result);
      } else {
        setError("Filename is required to determine subject code");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        await uploadCSV(csvContent, file.name);
      } catch (error) {
        setError("Failed to read file");
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-gray-600 font-sans">Loading...</span>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            You must be logged in to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-sans">
          Import Questions
        </h1>
        <p className="text-gray-600 mt-2 font-sans">
          Upload CSV files to import questions into the system
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-200">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-brand-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h2 className="text-xl font-semibold text-brand-800 font-sans">
              Upload CSV File
            </h2>
          </div>
          <p className="text-brand-700 mt-1 font-sans">
            Import questions from a properly formatted CSV file
          </p>
        </div>

        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-brand-500 bg-brand-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-2 font-sans">
              Drop your CSV file here
            </p>
            <p className="text-gray-500 mb-4 font-sans">
              or click to browse and select a file
            </p>
            <Button
              type="button"
              onClick={handleBrowseClick}
              disabled={isUploading}
              className="mx-auto"
            >
              {isUploading ? "Uploading..." : "Browse Files"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {isUploading && (
            <div className="mt-6">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                <span className="text-sm text-gray-600 font-sans">
                  Processing CSV file...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {uploadResult && (
            <div className="mt-6">
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">
                      Import completed successfully!
                    </p>
                    <div className="text-sm space-y-1">
                      <p>• Processed: {uploadResult.processed} records</p>
                      <p>• Successful: {uploadResult.successful} questions</p>
                      <p>• Failed: {uploadResult.failed} records</p>
                      <p>
                        • Subjects created:{" "}
                        {uploadResult.subjects?.created || 0}
                      </p>
                      <p>
                        • Subjects existing:{" "}
                        {uploadResult.subjects?.existing || 0}
                      </p>
                    </div>
                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-red-700">Errors:</p>
                        <ul className="text-xs text-red-600 list-disc list-inside">
                          {uploadResult.errors
                            .slice(0, 5)
                            .map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          {uploadResult.errors.length > 5 && (
                            <li>
                              ... and {uploadResult.errors.length - 5} more
                              errors
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-gray-600"
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
            <h2 className="text-xl font-semibold text-gray-800 font-sans">
              CSV Format Requirements
            </h2>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4 text-sm text-gray-600 font-sans">
            <p>Your CSV file must include the following columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Question Text:</strong> The question content
              </li>
              <li>
                <strong>Option A:</strong> First answer option
              </li>
              <li>
                <strong>Option B:</strong> Second answer option
              </li>
              <li>
                <strong>Option C:</strong> Third answer option
              </li>
              <li>
                <strong>Option D:</strong> Fourth answer option
              </li>
              <li>
                <strong>Option E:</strong> Fifth answer option (optional)
              </li>
              <li>
                <strong>Correct Answer:</strong> The correct option (A, B, C, or
                D)
              </li>
            </ul>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-medium text-yellow-800 mb-2">
                📁 Filename as Subject Code:
              </p>
              <p className="text-yellow-700 text-sm">
                The CSV filename (without .csv extension) will be used as the
                subject code. For example:{" "}
                <code className="bg-yellow-100 px-1 rounded">SS2_MATH.csv</code>{" "}
                will create questions for Mathematics in SS2 class.
              </p>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-700 mb-2">Example CSV row:</p>
              <code className="text-xs bg-white p-2 rounded border block">
                "What is 2+2?","3","4","5","6","B"
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
