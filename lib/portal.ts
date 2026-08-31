import type { UserRole } from "@/types/auth";

export type AuthPortal = "admin" | "teacher" | "student";

const PORTAL_ROLES: Record<AuthPortal, UserRole> = {
  admin: "ADMIN",
  teacher: "TEACHER",
  student: "STUDENT",
};

const LOCAL_PORTALS: Record<string, AuthPortal> = {
  "3000": "admin",
  "3001": "teacher",
  "3002": "student",
};

export function getPortalFromHost(host: string | null): AuthPortal | null {
  if (!host) return null;

  const forwardedHost = host.split(",", 1)[0]?.trim().toLowerCase();
  if (!forwardedHost) return null;

  try {
    const url = new URL(`http://${forwardedHost}`);
    if (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      LOCAL_PORTALS[url.port]
    ) {
      return LOCAL_PORTALS[url.port];
    }

    if (
      url.hostname.endsWith(".estude.io.vn") ||
      url.hostname.endsWith(".localhost")
    ) {
      const subdomain = url.hostname.split(".", 1)[0];
      if (subdomain === "admin" || subdomain === "teacher" || subdomain === "student") {
        return subdomain;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getCurrentPortal(): AuthPortal {
  if (typeof window !== "undefined") {
    return getPortalFromHost(window.location.host) ?? "student";
  }
  return "student";
}

export function getPortalRole(portal: AuthPortal): UserRole {
  return PORTAL_ROLES[portal];
}

export function getCurrentPortalRole(): UserRole {
  return getPortalRole(getCurrentPortal());
}
