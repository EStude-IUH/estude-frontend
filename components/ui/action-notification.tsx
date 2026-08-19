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
import { CheckCircle2, X } from "lucide-react";

interface NotificationItem {
  id: string;
  key: string;
  message: string;
  count: number;
}

interface NotifyOptions {
  key?: string;
}

interface ActionNotificationContextValue {
  notify: (message: string, options?: NotifyOptions) => void;
}

const ActionNotificationContext = createContext<
  ActionNotificationContextValue | undefined
>(undefined);

const notificationDuration = 1800;

export function ActionNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const timersRef = useRef(new Map<string, number>());
  const nextIdRef = useRef(0);

  const notify = useCallback((message: string, options: NotifyOptions = {}) => {
    const key = options.key ?? message;
    const existingTimer = timersRef.current.get(key);
    if (existingTimer) window.clearTimeout(existingTimer);

    setNotifications((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, count: item.count + 1 } : item,
        );
      }

      return [
        ...current,
        {
          id: `${key}-${nextIdRef.current++}`,
          key,
          message,
          count: 1,
        },
      ];
    });

    const timer = window.setTimeout(() => {
      setNotifications((current) =>
        current.filter((notification) => notification.key !== key),
      );
      timersRef.current.delete(key);
    }, notificationDuration);
    timersRef.current.set(key, timer);
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ActionNotificationContext.Provider value={{ notify }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex w-fit max-w-[calc(100vw-2rem)] flex-col gap-2">
          {notifications.map((notification) => (
            <div
              key={`${notification.id}-${notification.count}`}
              role="status"
              className="action-notification pointer-events-auto flex w-fit max-w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-950/10"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                {notification.message}
                {notification.count > 1 ? ` (${notification.count})` : ""}
              </span>
              <button
                type="button"
                className="shrink-0 text-emerald-600 transition hover:text-emerald-900"
                aria-label="Đóng thông báo"
                onClick={() => {
                  const timer = timersRef.current.get(notification.key);
                  if (timer) window.clearTimeout(timer);
                  timersRef.current.delete(notification.key);
                  setNotifications((current) =>
                    current.filter((item) => item.key !== notification.key),
                  );
                }}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ActionNotificationContext.Provider>
  );
}

export function useActionNotification(): ActionNotificationContextValue {
  const context = useContext(ActionNotificationContext);
  if (!context) {
    throw new Error(
      "useActionNotification must be used within ActionNotificationProvider",
    );
  }
  return context;
}
