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

interface CreateUserData {
  name: string;
  studentCode: string;
  pin: string;
  class: Class;
  gender: Gender;
}

interface DeleteAttemptData {
  studentCode: string;
  subjectCode: string;
}

export function CreateUserClient() {
  const { admin, isLoading } = useAdminAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const ipcDb = new IPCDatabaseService();

  const [createFormData, setCreateFormData] = useState<CreateUserData>({
    name: "",
    studentCode: "",
    pin: "",
    class: "SS2",
    gender: "MALE",
  });

  const [deleteFormData, setDeleteFormData] = useState<DeleteAttemptData>({
    studentCode: "",
    subjectCode: "",
  });

  const handleCreateUser = async () => {
    if (!admin) {
      setError("You must be logged in to create users");
      return;
    }

    if (
      !createFormData.name ||
      !createFormData.studentCode ||
      !createFormData.pin
    ) {
      setError("All fields are required");
      return;
    }

    setIsCreating(true);
    setError(null);
    setSuccess(false);

    try {
      await ipcDb.createUser({
        id: crypto.randomUUID(),
        name: createFormData.name,
        studentCode: createFormData.studentCode,
        passwordHash: createFormData.pin,
        class: createFormData.class,
        gender: createFormData.gender,
      });

      setSuccess(true);
      setCreateFormData({
        name: "",
        studentCode: "",
        pin: "",
        class: "SS2",
        gender: "MALE",
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create user"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAttempts = async () => {
    if (!admin) {
      setDeleteError("You must be logged in to delete attempts");
      return;
    }

    if (!deleteFormData.studentCode || !deleteFormData.subjectCode) {
      setDeleteError("Both student code and subject code are required");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(false);

    try {
      const result = await ipcDb.deleteLocalQuizAttempts(
        deleteFormData.studentCode,
        deleteFormData.subjectCode
      );

      if (result.success) {
        setDeleteSuccess(true);
        setDeleteFormData({
          studentCode: "",
          subjectCode: "",
        });
      } else {
        setDeleteError(result.error || "Failed to delete attempts");
      }
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete attempts"
      );
    } finally {
      setIsDeleting(false);
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
          User Management
        </h1>
        <p className="text-gray-600 mt-2 font-sans">
          Create new users and manage quiz attempts
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-200">
          <h2 className="text-xl font-semibold text-brand-800 font-sans">
            Create New User
          </h2>
          <p className="text-brand-700 mt-1 font-sans">
            Add a new student to the system
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
                value={createFormData.name}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, name: e.target.value })
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
                value={createFormData.studentCode}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
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
                value={createFormData.pin}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, pin: e.target.value })
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
                value={createFormData.class}
                onValueChange={(value: Class) =>
                  setCreateFormData({ ...createFormData, class: value })
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
                value={createFormData.gender}
                onValueChange={(value: Gender) =>
                  setCreateFormData({ ...createFormData, gender: value })
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
              onClick={handleCreateUser}
              disabled={isCreating}
              className="w-full md:w-auto"
            >
              {isCreating ? "Creating..." : "Create User"}
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
                <AlertDescription>User created successfully!</AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-red-50 px-6 py-4 border-b border-red-200">
          <h2 className="text-xl font-semibold text-red-800 font-sans">
            Delete Quiz Attempts
          </h2>
          <p className="text-red-700 mt-1 font-sans">
            Remove quiz attempts for a specific student and subject
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Code
              </label>
              <Input
                type="text"
                value={deleteFormData.studentCode}
                onChange={(e) =>
                  setDeleteFormData({
                    ...deleteFormData,
                    studentCode: e.target.value,
                  })
                }
                placeholder="e.g., SS2_STU_001"
                disabled={isDeleting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Code
              </label>
              <Input
                type="text"
                value={deleteFormData.subjectCode}
                onChange={(e) =>
                  setDeleteFormData({
                    ...deleteFormData,
                    subjectCode: e.target.value,
                  })
                }
                placeholder="e.g., SS2_MATH"
                disabled={isDeleting}
              />
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleDeleteAttempts}
              disabled={isDeleting}
              variant="destructive"
              className="w-full md:w-auto"
            >
              {isDeleting ? "Deleting..." : "Delete Attempts"}
            </Button>
          </div>

          {deleteError && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            </div>
          )}

          {deleteSuccess && (
            <div className="mt-4">
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  Quiz attempts deleted successfully!
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
