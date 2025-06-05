"use client";

import { useState } from "react";
import { cn } from "@/utils/lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AuthenticationService } from "@/lib/auth/authentication-service";
import { toast } from "sonner";
import type { AuthResult } from "@/types/app";
import { useRouter } from "next/navigation";
import {
  Loader2,
  GraduationCap,
  User,
  BookOpen,
  Lock,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

interface LoginFormProps {
  onSuccess: (authResult: AuthResult) => void;
  onError?: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [formData, setFormData] = useState({
    studentCode: "",
    subjectCode: "",
    pin: "",
    timeLimit: 5400, // 1h 30m in seconds
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

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

  const formatTimeDisplay = (seconds: number): string => {
    if (seconds === 0) return "No time limit";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white rounded-lg border border-brand-200 p-8 space-y-6 font-sans">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="w-16 h-16 bg-brand-600 rounded-xl mx-auto flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-900 mb-2 font-sans">
              Lifeville Quiz System
            </h1>
            <p className="text-sm text-brand-600 font-sans">
              Enter your credentials to access your quiz
            </p>
          </div>
        </div>

        <Separator className="bg-brand-200" />

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert
              variant="destructive"
              className="border-incorrect-200 bg-incorrect-50"
            >
              <AlertDescription className="text-incorrect-700">
                {errors.general}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-800 flex items-center gap-2 font-sans">
                <User className="h-4 w-4 text-brand-600" />
                Student Code
              </label>
              <Input
                type="text"
                value={formData.studentCode}
                onChange={(e) =>
                  handleInputChange("studentCode", e.target.value)
                }
                placeholder="Enter your student code (e.g. SS2_STU_001)"
                className={cn(
                  "font-mono",
                  errors.studentCode &&
                    "border-incorrect-500 focus:border-incorrect-500 bg-incorrect-50"
                )}
                disabled={loading}
              />
              {errors.studentCode && (
                <p className="text-sm text-incorrect-600 font-sans">
                  {errors.studentCode}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-800 flex items-center gap-2 font-sans">
                <BookOpen className="h-4 w-4 text-brand-600" />
                Subject Code
              </label>
              <Input
                type="text"
                value={formData.subjectCode}
                onChange={(e) =>
                  handleInputChange("subjectCode", e.target.value)
                }
                placeholder="Enter subject code (e.g. SS2_MATH)"
                className={cn(
                  "font-mono",
                  errors.subjectCode &&
                    "border-incorrect-500 focus:border-incorrect-500 bg-incorrect-50"
                )}
                disabled={loading}
              />
              {errors.subjectCode && (
                <p className="text-sm text-incorrect-600 font-sans">
                  {errors.subjectCode}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-800 flex items-center gap-2 font-sans">
                <Lock className="h-4 w-4 text-brand-600" />
                PIN
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.pin}
                  onChange={(e) => handleInputChange("pin", e.target.value)}
                  placeholder="Enter your 6-digit PIN"
                  maxLength={6}
                  className={cn(
                    "font-mono tracking-widest text-center bg-brand-50 border-brand-200 focus:border-brand-500 focus:ring-brand-200",
                    errors.pin &&
                      "border-incorrect-500 focus:border-incorrect-500 bg-incorrect-50"
                  )}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-brand-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.pin && (
                <p className="text-sm text-incorrect-600 font-sans">
                  {errors.pin}
                </p>
              )}
            </div>
          </div>

          <Separator className="bg-brand-200" />

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-800 flex items-center gap-2 font-sans">
                <Clock className="h-4 w-4 text-brand-600" />
                Exam Time Limit
              </label>
              <TimeInput
                value={formData.timeLimit}
                onChange={(timeLimit) =>
                  handleInputChange("timeLimit", timeLimit)
                }
                disabled={loading}
                className="bg-brand-50 border-brand-200 focus:border-brand-500 focus:ring-brand-200"
              />
              <div className="text-xs text-brand-500 font-sans">
                Current setting:{" "}
                <span className="font-semibold">
                  {formatTimeDisplay(formData.timeLimit)}
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-brand-200" />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white border-0 font-sans font-semibold"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <GraduationCap className="mr-2 h-4 w-4" />
                Access Quiz
              </>
            )}
          </Button>
        </form>

        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs text-brand-600 text-center font-sans">
            <span className="font-semibold">Need assistance?</span> Contact your
            instructor for login credentials or technical support
          </p>
        </div>
      </div>
    </div>
  );
}
