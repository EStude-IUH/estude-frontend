"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  width = "max-w-lg",
  titleClassName,
  bodyClassName,
  footerClassName,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop-enter fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/10 p-4 backdrop-blur-[1px]">
      <button
        className="absolute inset-0"
        type="button"
        onClick={onClose}
        aria-label="Đóng hộp thoại"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "modal-panel-enter relative my-auto w-full rounded-2xl border border-slate-200 bg-white shadow-2xl",
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2
              id="modal-title"
              className={cn(
                "text-lg font-extrabold text-slate-950",
                titleClassName,
              )}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="size-10 !rounded-full px-0"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="size-7" strokeWidth={2.5} />
          </Button>
        </header>
        <div className={cn("p-5", bodyClassName)}>{children}</div>
        {footer ? (
          <footer
            className={cn(
              "flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4",
              footerClassName,
            )}
          >
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
