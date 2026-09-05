"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { authenticatedRequest } from "@/lib/auth-api";
import { routePermission } from "@/lib/permissions";

const PermissionsContext = createContext<{
  loading: boolean;
  permissions: string[];
  can: (key: string) => boolean;
  canVisit: (path: string) => boolean;
  refresh: () => Promise<void>;
}>({
  loading: true,
  permissions: [] as string[],
  can: () => false,
  canVisit: () => false,
  refresh: async (): Promise<void> => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth();
  const requestSequence = useRef(0);
  const [state, setState] = useState<{
    userId: string;
    permissions: string[];
  } | null>(null);
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!user) {
      setState(null);
      return;
    }
    try {
      const result = await authenticatedRequest<{ permissions: string[] }>(
        "/permissions/me",
      );
      if (sequence === requestSequence.current) setState({ userId: user.id, permissions: result.permissions });
    } catch {
      if (sequence === requestSequence.current) setState({ userId: user.id, permissions: [] });
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(onFocus, 30000);
    return () => {
      requestSequence.current++;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const permissions =
    state?.userId === user?.id ? (state?.permissions ?? []) : [];
  const loading = isInitializing || Boolean(user && state?.userId !== user.id);
  const can = (key: string) => permissions.includes(key);
  const canVisit = (path: string) => {
    const key = routePermission(path);
    return Boolean(user) && (key === null || can(key));
  };
  return (
    <PermissionsContext.Provider
      value={{ loading, permissions, can, canVisit, refresh }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
