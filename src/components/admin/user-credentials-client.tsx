"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useAdminData } from "@/hooks/use-admin-data";
import { useFilteredData } from "@/hooks/use-filtered-data";
import { UserCredentialsSkeleton } from "@/components/skeletons/user-credentials-skeleton";
import { downloadCSV, csvExtractors } from "@/utils/download";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Download, Search, RefreshCw } from "lucide-react";
import type { Class } from "@/types/app";

export function UserCredentialsClient() {
  const { admin, isLoading: authLoading } = useAdminAuth();
  const [showPins, setShowPins] = useState(false);

  const {
    data: credentials,
    isLoading: dataLoading,
    error: dataError,
    refresh,
  } = useAdminData(
    async () => {
      const ipcDbService = new IPCDatabaseService();
      return ipcDbService.getStudentCredentials();
    },
    { autoRefresh: false }
  );

  const {
    filteredData: filteredCredentials,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    clearFilters,
  } = useFilteredData(
    credentials || [],
    {
      searchFields: ["name", "studentCode"],
      customFilters: {
        class: (item, value: Class | "ALL") =>
          value === "ALL" || item.class === value,
      },
    },
    300
  );

  const selectedClass = (filters.class as Class | "ALL") || "ALL";

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!", {
        description: `${description} copied to clipboard`,
      });
    } catch (error) {
      toast.error("Copy failed", {
        description: "Unable to copy to clipboard",
      });
    }
  };

  const copyAllCredentials = async () => {
    const credentialsText = filteredCredentials
      .map((cred) => {
        const pinText = cred.pin.startsWith("[HIDDEN")
          ? "PIN: [Hidden - Remote User]"
          : `PIN: ${cred.pin}`;

        return `Name: ${cred.name}\nStudent Code: ${cred.studentCode}\n${pinText}\nClass: ${cred.class}\nGender: ${cred.gender}\n`;
      })
      .join("\n---\n\n");

    await copyToClipboard(credentialsText, "All credentials");
  };

  const downloadCredentials = () => {
    downloadCSV({
      data: filteredCredentials,
      headers: ["Name", "Student Code", "PIN", "Class", "Gender"],
      extractValues: csvExtractors.studentCredentials,
      filename: `student-credentials-${
        selectedClass === "ALL" ? "all" : selectedClass
      }`,
      successMessage: "Credentials exported to CSV file",
    });
  };

  const isLoading = authLoading || dataLoading;

  if (isLoading) {
    return <UserCredentialsSkeleton />;
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

  if (dataError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load student credentials. Please try refreshing the page.
          </AlertDescription>
        </Alert>
        <Button onClick={refresh} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-sans">
          Student Login Credentials
        </h1>
        <p className="text-gray-600 mt-2 font-sans">
          All student login details for quiz access
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Students
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by name or student code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
              <Select
                value={selectedClass}
                onValueChange={(value: Class | "ALL") =>
                  updateFilter("class", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  <SelectItem value="BASIC5">BASIC5</SelectItem>
                  <SelectItem value="JSS3">JSS3</SelectItem>
                  <SelectItem value="SS2">SS2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPins(!showPins)}
              className="flex items-center gap-2"
            >
              {showPins ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {showPins ? "Hide PINs" : "Show PINs"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAllCredentials}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy All
            </Button>
            <Button
              size="sm"
              onClick={downloadCredentials}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={dataLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`}
              />
              {dataLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredCredentials.length} of {credentials?.length || 0}{" "}
            students
          </span>
          {showPins && (
            <span className="text-yellow-600 font-medium">
              ⚠️ PINs are visible
            </span>
          )}
        </div>

        {(searchTerm || selectedClass !== "ALL") && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Student Code
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  PIN
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Class
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Gender
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 font-sans">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCredentials.map((credential, index) => (
                <tr key={credential.studentCode} className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900 font-sans">
                    {credential.name}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-700">
                    {credential.studentCode}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono">
                    {showPins ? (
                      credential.pin.startsWith("[HIDDEN") ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded border text-xs">
                            Remote User
                          </span>
                          <span className="text-gray-500 text-xs">
                            PIN not visible
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="bg-yellow-100 px-2 py-1 rounded border">
                            {credential.pin}
                          </span>
                          <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs">
                            Seeded
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400">••••••</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="font-sans">
                      {credential.class}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 font-sans">
                    {credential.gender}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            credential.studentCode,
                            "Student code"
                          )
                        }
                        className="h-8 px-2"
                        title="Copy student code"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {showPins && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (credential.pin.startsWith("[HIDDEN")) {
                              toast.error("Cannot copy PIN", {
                                description:
                                  "PIN is not visible for remotely created users",
                              });
                            } else {
                              copyToClipboard(credential.pin, "PIN");
                            }
                          }}
                          className="h-8 px-2"
                          title={
                            credential.pin.startsWith("[HIDDEN")
                              ? "PIN not available for remote users"
                              : "Copy PIN"
                          }
                          disabled={credential.pin.startsWith("[HIDDEN")}
                        >
                          <Copy
                            className={`w-3 h-3 ${
                              credential.pin.startsWith("[HIDDEN")
                                ? "text-gray-400"
                                : "text-yellow-600"
                            }`}
                          />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCredentials.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500 font-sans">
              No students found matching your criteria
            </p>
          </div>
        )}
      </div>

      <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
        <AlertDescription className="font-sans">
          <strong>Security Notice:</strong> This page displays sensitive login
          information. Ensure you're in a secure environment when viewing PINs
          and sharing credentials with students only through secure channels.
        </AlertDescription>
      </Alert>

      <Alert className="border-blue-200 bg-blue-50 text-blue-800">
        <AlertDescription className="font-sans">
          <strong>User Types:</strong>
          <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs ml-2 mr-1">
            Seeded
          </span>
          users are bulk-imported with visible PINs.
          <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs ml-2 mr-1">
            Remote
          </span>
          users are individually created via admin panel with hidden PINs for
          security.
        </AlertDescription>
      </Alert>
    </div>
  );
}
