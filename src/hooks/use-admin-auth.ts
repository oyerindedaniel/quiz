import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthenticationService } from "@/lib/auth/authentication-service";
import type { RemoteAdmin } from "@/lib/database/remote-schema";

interface UseAdminAuthOptions {
  redirectPath?: string;
  requireElectron?: boolean;
  skipRedirect?: boolean;
}

interface UseAdminAuthReturn {
  admin: RemoteAdmin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuthentication: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useAdminAuth(
  options: UseAdminAuthOptions = {}
): UseAdminAuthReturn {
  const {
    redirectPath = "/",
    requireElectron = false,
    skipRedirect = false,
  } = options;

  const [admin, setAdmin] = useState<RemoteAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const authService = AuthenticationService.getInstance();

  const checkAuthentication = async () => {
    try {
      if (requireElectron && !authService.isElectronEnvironment()) {
        if (!skipRedirect) {
          router.push("/");
        }
        return;
      }

      const session = await authService.getCurrentAdminSession();

      if (session.isAuthenticated && session.admin) {
        setAdmin(session.admin);
      } else {
        setAdmin(null);
        if (!skipRedirect) {
          router.push(redirectPath);
        }
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      setAdmin(null);
      if (!skipRedirect) {
        router.push(redirectPath);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logoutAdmin();
      setAdmin(null);
      router.push(redirectPath);
    } catch (error) {
      console.error("Logout failed:", error);
      router.push(redirectPath);
    }
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  return {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    checkAuthentication,
    logout,
  };
}
