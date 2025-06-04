"use client";

import { useState } from "react";
import { cn } from "@/utils/lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthenticationService } from "@/lib/auth/authentication-service";
import { toast } from "sonner";
import type { AuthResult } from "@/types/app";
import { useRouter } from "next/navigation";

interface LoginFormProps {
  onSuccess: (authResult: AuthResult) => void;
  onError?: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [formData, setFormData] = useState({
    studentCode: "",
    subjectCode: "",
    pin: "",
    timeLimit: 0, // in seconds
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();

  const authService = AuthenticationService.getInstance();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.studentCode.trim()) {
      newErrors.studentCode = "Student code is required";
    }

    if (!formData.subjectCode.trim()) {
      newErrors.subjectCode = "Subject code is required";
    }

    if (!formData.pin.trim()) {
      newErrors.pin = "PIN is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!authService.isElectronEnvironment()) {
      const errorMessage = "This application requires Electron to run";
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await authService.authenticateStudent(
        formData.studentCode.trim().toUpperCase(),
        formData.subjectCode.trim().toUpperCase(),
        formData.pin.trim()
      );

      if (result.success) {
        if (formData.timeLimit > 0 && result.user && result.subject) {
          try {
            await authService.setQuizTimeLimit(
              result.user.id,
              result.subject.id,
              formData.timeLimit
            );
            toast.success("Time limit set successfully", {
              description: `Quiz time limit: ${Math.floor(
                formData.timeLimit / 60
              )} minutes`,
            });
          } catch (error) {
            console.warn("Failed to store time limit:", error);
            toast.warning("Time limit not saved", {
              description: "Proceeding without time limit",
            });
          }
        }

        toast.success("Authentication successful!", {
          description: `Welcome ${result.user?.name}`,
        });

        onSuccess(result);
        router.push("/quiz");
      } else {
        const errorMessage = result.error || "Authentication failed";
        setErrors({ general: errorMessage });
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An unexpected error occurred. Please try again.";
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
      console.error("Login form error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl mx-auto mb-4 flex items-center justify-center">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 font-sans uppercase">
            Lifeville Login
          </h1>
          <p className="text-gray-600">Enter your credentials to begin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="studentCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Student Code
              </label>
              <Input
                id="studentCode"
                type="text"
                value={formData.studentCode}
                onChange={(e) =>
                  handleInputChange("studentCode", e.target.value)
                }
                placeholder="STU001"
                className={cn(
                  "font-mono tracking-wide",
                  errors.studentCode &&
                    "border-incorrect-500 focus-visible:border-incorrect-500"
                )}
                disabled={loading}
              />
              {errors.studentCode && (
                <p className="text-sm text-incorrect-600 mt-1">
                  {errors.studentCode}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="subjectCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Subject Code
              </label>
              <Input
                id="subjectCode"
                type="text"
                value={formData.subjectCode}
                onChange={(e) =>
                  handleInputChange("subjectCode", e.target.value)
                }
                placeholder="MATH101"
                className={cn(
                  "font-mono tracking-wide",
                  errors.subjectCode &&
                    "border-incorrect-500 focus-visible:border-incorrect-500"
                )}
                disabled={loading}
              />
              {errors.subjectCode && (
                <p className="text-sm text-incorrect-600 mt-1">
                  {errors.subjectCode}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="pin"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                PIN
              </label>
              <Input
                id="pin"
                type="password"
                value={formData.pin}
                onChange={(e) => handleInputChange("pin", e.target.value)}
                placeholder="123456"
                maxLength={6}
                className={cn(
                  "font-mono tracking-widest text-center",
                  errors.pin &&
                    "border-incorrect-500 focus-visible:border-incorrect-500"
                )}
                disabled={loading}
              />
              {errors.pin && (
                <p className="text-sm text-incorrect-600 mt-1">{errors.pin}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Time Limit
              </label>
              <TimeInput
                value={formData.timeLimit}
                onChange={(timeLimit) =>
                  handleInputChange("timeLimit", timeLimit)
                }
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4"
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
                Authenticating...
              </div>
            ) : (
              "Access Quiz"
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">
            Need assistance? Contact your instructor for login credentials
          </p>
        </div>
      </div>
    </div>
  );
}
