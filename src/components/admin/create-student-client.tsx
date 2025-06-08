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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { CreateUserSkeleton } from "@/components/skeletons/create-user-skeleton";
import type { Gender, Class } from "@/lib/database/remote-schema";

interface CreateStudentData {
  name: string;
  studentCode: string;
  pin: string;
  class: Class;
  gender: Gender;
}

export function CreateStudentClient() {
  const { admin, isLoading } = useAdminAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedStudent, setLastCreatedStudent] =
    useState<CreateStudentData | null>(null);

  const ipcDb = new IPCDatabaseService();

  const [formData, setFormData] = useState<CreateStudentData>({
    name: "",
    studentCode: "",
    pin: "",
    class: "SS2",
    gender: "MALE",
  });

  const handleCreateStudent = async () => {
    if (!admin) {
      setError("You must be logged in to create students");
      return;
    }

    if (!formData.name || !formData.studentCode || !formData.pin) {
      setError("All fields are required");
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(false);

    try {
      await ipcDb.createStudent({
        id: crypto.randomUUID(),
        name: formData.name,
        studentCode: formData.studentCode,
        passwordHash: formData.pin,
        class: formData.class,
        gender: formData.gender,
      });

      setSuccess(true);
      setLastCreatedStudent(formData); // Store before clearing form
      setFormData({
        name: "",
        studentCode: "",
        pin: "",
        class: "SS2",
        gender: "MALE",
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create student"
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <CreateUserSkeleton />;
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
          Create Student
        </h1>
        <p className="text-gray-600 mt-2 font-sans">
          Add a new student directly to the remote database
        </p>
      </div>

      {/* Create Student Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-200">
          <h2 className="text-xl font-semibold text-brand-800 font-sans">
            Student Information
          </h2>
          <p className="text-brand-700 mt-1 font-sans">
            Create a new student account in the remote database
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter full name"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Code
              </label>
              <Input
                type="text"
                value={formData.studentCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    studentCode: e.target.value,
                  })
                }
                placeholder="e.g., SS2_STU_001"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN (Password)
              </label>
              <Input
                type="text"
                value={formData.pin}
                onChange={(e) =>
                  setFormData({ ...formData, pin: e.target.value })
                }
                placeholder="6-digit PIN"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <Select
                value={formData.class}
                onValueChange={(value: Class) =>
                  setFormData({ ...formData, class: value })
                }
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC5">BASIC5</SelectItem>
                  <SelectItem value="JSS3">JSS3</SelectItem>
                  <SelectItem value="SS2">SS2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <Select
                value={formData.gender}
                onValueChange={(value: Gender) =>
                  setFormData({ ...formData, gender: value })
                }
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleCreateStudent}
              disabled={isCreating}
              className="w-full md:w-auto"
            >
              {isCreating ? "Creating..." : "Create Student"}
            </Button>
          </div>

          {error && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {success && (
            <div className="mt-4">
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  Student created successfully!
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>

      {lastCreatedStudent && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold text-gray-900 font-sans">
            Last Created Student Details
          </h3>
          <p className="text-gray-600 mt-2 font-sans">
            Name: {lastCreatedStudent.name}
          </p>
          <p className="text-gray-600 mt-2 font-sans">
            Student Code: {lastCreatedStudent.studentCode}
          </p>
          <p className="text-gray-600 mt-2 font-sans">
            PIN: {lastCreatedStudent.pin}
          </p>
          <p className="text-gray-600 mt-2 font-sans">
            Class: {lastCreatedStudent.class}
          </p>
          <p className="text-gray-600 mt-2 font-sans">
            Gender: {lastCreatedStudent.gender}
          </p>
        </div>
      )}
    </div>
  );
}
