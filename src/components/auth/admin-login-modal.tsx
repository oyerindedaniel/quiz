"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthenticationService } from "@/lib/auth/authentication-service";
import { toast } from "sonner";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminLoginForm {
  username: string;
  password: string;
}

export function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const [formData, setFormData] = useState<AdminLoginForm>({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const authService = AuthenticationService.getInstance();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ username: "", password: "" });
      setErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!authService.isElectronEnvironment()) {
      const errorMessage = "Admin login requires Electron environment";
      setErrors({ general: errorMessage });
      toast.error("Environment Error", {
        description: errorMessage,
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await authService.authenticateAdmin(
        formData.username.trim(),
        formData.password.trim()
      );

      if (result.success) {
        toast.success("Admin login successful!", {
          description: `Welcome ${result.admin?.firstName} ${result.admin?.lastName}`,
        });
        onClose();
        router.push("/admin/dashboard");
      } else {
        const errorMessage = result.error || "Authentication failed";
        setErrors({ general: errorMessage });
        toast.error("Login failed", {
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error("Admin login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setErrors({ general: errorMessage });
      toast.error("Login error", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AdminLoginForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-sans text-xl font-bold text-gray-900">
            Admin Access
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-sans text-sm">
              Restricted administrative access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <Alert variant="destructive">
                <AlertDescription className="font-sans">
                  {errors.general}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="admin-username"
                  className="block text-sm font-medium text-gray-700 mb-2 font-sans"
                >
                  Username
                </label>
                <Input
                  id="admin-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  placeholder="admin"
                  className={cn(
                    "font-mono",
                    errors.username &&
                      "border-incorrect-500 focus-visible:border-incorrect-500"
                  )}
                  disabled={loading}
                />
                {errors.username && (
                  <p className="text-sm text-incorrect-600 mt-1 font-sans">
                    {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-medium text-gray-700 mb-2 font-sans"
                >
                  Password
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="••••••••"
                  className={cn(
                    "font-mono",
                    errors.password &&
                      "border-incorrect-500 focus-visible:border-incorrect-500"
                  )}
                  disabled={loading}
                />
                {errors.password && (
                  <p className="text-sm text-incorrect-600 mt-1 font-sans">
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1 font-sans"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-brand-600 hover:bg-brand-700 font-sans"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                    Verifying...
                  </div>
                ) : (
                  "Access Dashboard"
                )}
              </Button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-xs text-gray-500 font-sans">
              Administrative access is logged and monitored
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
