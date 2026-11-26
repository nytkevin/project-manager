"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

export type ProtectedRouteUser = {
  id: string;
  fullname: string;
  username: string;
  email: string;
  created_at: string;
};

type ProtectedRouteProps = {
  children: React.ReactNode;
  authorize?: (user: ProtectedRouteUser) => boolean;
  unauthorizedFallback?: React.ReactNode;
};

const ProtectedUserContext = createContext<ProtectedRouteUser | null>(null);

export function useProtectedUser(): ProtectedRouteUser | null {
  return useContext(ProtectedUserContext);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export default function ProtectedRoute({
  children,
  authorize,
  unauthorizedFallback = null,
}: ProtectedRouteProps) {
  const router = useRouter();
  const [user, setUser] = useState<ProtectedRouteUser | null>(null);
  const [status, setStatus] = useState<
    "checking" | "authorized" | "unauthorized" | "network-error"
  >("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const handleAuthRequired = () => {
      setStatus("unauthorized");
      router.replace("/login");
    };
    window.addEventListener("projecthub:auth-required", handleAuthRequired);
    return () =>
      window.removeEventListener("projecthub:auth-required", handleAuthRequired);
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      setStatus("checking");

      try {
        const meResponse = await fetch(`${API_URL}/users/me`, {
          credentials: "include",
          cache: "no-store",
        });

        if (cancelled) return;

        if (meResponse.ok) {
          const user = (await meResponse.json()) as ProtectedRouteUser;
          if (!authorize || authorize(user)) {
            setUser(user);
            setStatus("authorized");
          } else {
            setStatus("unauthorized");
            router.replace("/login");
          }
          return;
        }

        if (meResponse.status === 401) {
          let refreshed = false;

          try {
            const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
              method: "POST",
              credentials: "include",
              headers: {
                "X-CSRF-Token": getCookie("csrf_token") ?? "",
              },
            });
            refreshed = refreshResponse.ok;

            if (!refreshResponse.ok && refreshResponse.status !== 401 && refreshResponse.status !== 403) {
              if (!cancelled) setStatus("network-error");
              return;
            }
            if (refreshResponse.status === 403) {
              if (!cancelled) setStatus("unauthorized");
              router.replace("/login");
              return;
            }
          } catch {
            if (!cancelled) setStatus("network-error");
            return;
          }

          if (!refreshed) {
            router.replace("/login");
            return;
          }

          const retriedResponse = await fetch(`${API_URL}/users/me`, {
            credentials: "include",
            cache: "no-store",
          });

          if (cancelled) return;

          if (retriedResponse.status === 401 || retriedResponse.status === 403) {
            router.replace("/login");
            return;
          }

          if (!retriedResponse.ok) {
            setStatus("network-error");
            return;
          }

          const user = (await retriedResponse.json()) as ProtectedRouteUser;
          if (!authorize || authorize(user)) {
            setUser(user);
            setStatus("authorized");
          } else {
            setStatus("unauthorized");
            router.replace("/login");
          }
          return;
        }

        if (meResponse.status === 403) {
          router.replace("/login");
          return;
        }

        setStatus("network-error");
      } catch {
        if (!cancelled) setStatus("network-error");
      }
    };

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [attempt, authorize, router]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9]">
        <p className="text-sm text-zinc-500" role="status">
          Checking authentication...
        </p>
      </div>
    );
  }

  if (status === "network-error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9]">
        <div className="text-center">
          <p className="text-sm text-zinc-600">Unable to verify your session.</p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (status === "unauthorized" && unauthorizedFallback !== null) {
    return <>{unauthorizedFallback}</>;
  }

  if (status !== "authorized") {
    return null;
  }

  return (
    <ProtectedUserContext.Provider value={user}>
      {children}
    </ProtectedUserContext.Provider>
  );
}
