"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { FileImage, FileText, LoaderCircle, Paperclip, Send, Wifi, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, authenticatedRequest, getRealtimeAccessToken } from "@/lib/auth-api";
import type { User } from "@/types/auth";

type ChatAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: Pick<User, "id" | "fullName" | "accountName" | "avatarUrl" | "role">;
  attachments: ChatAttachment[];
};

type PendingAttachment = {
  id: string;
  file: File;
  status: "pending" | "uploading";
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

function socketUrl(): string {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1").replace(/\/$/, "");
  return apiUrl.replace(/\/api\/v1$/, "");
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function formatSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.details.join(" · ") || error.message : error instanceof Error ? error.message : fallback;
}

export function ClassChatPanel({ classId, className }: { classId: string; className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<PendingAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialise() {
      setLoading(true);
      setError("");
      try {
        const [history, user, token] = await Promise.all([
          authenticatedRequest<ChatMessage[]>(`/classes/${encodeURIComponent(classId)}/chat/messages`),
          authenticatedRequest<User>("/auth/me"),
          getRealtimeAccessToken(),
        ]);
        if (!active) return;
        setMessages(history);
        setCurrentUser(user);
        const socket = io(`${socketUrl()}/class-chat`, { auth: { token }, transports: ["websocket", "polling"] });
        socketRef.current = socket;
        socket.on("connect", () => {
          setConnected(true);
          socket.emit("class:join", { classId }, (result: { ok?: boolean; message?: string }) => {
            if (!result?.ok) setError(result?.message ?? "Không thể vào kênh trò chuyện");
          });
        });
        socket.on("disconnect", () => setConnected(false));
        socket.on("connect_error", () => setError("Không thể kết nối realtime. Hãy thử tải lại trang."));
        socket.on("chat:error", (event: { message?: string }) => setError(event?.message ?? "Phiên chat đã hết hạn"));
        socket.on("class:message", addMessage);
      } catch (cause) {
        if (active) setError(errorMessage(cause, "Không thể tải kênh trò chuyện"));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialise();
    return () => {
      active = false;
      socketRef.current?.emit("class:leave", { classId });
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [addMessage, classId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, sending]);

  function pickFiles(selected: FileList | null) {
    if (!selected?.length) return;
    const candidates = Array.from(selected);
    const oversized = candidates.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) { setError(`${oversized.name} vượt giới hạn 10MB`); return; }
    if (files.length + candidates.length > MAX_FILES) { setError(`Mỗi tin nhắn chỉ gửi tối đa ${MAX_FILES} tệp`); return; }
    setFiles((current) => [...current, ...candidates.map((file) => ({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, file, status: "pending" as const }))]);
  }

  async function openAttachment(attachment: ChatAttachment) {
    try {
      const { url } = await authenticatedRequest<{ url: string }>(`/classes/chat/attachments/${encodeURIComponent(attachment.id)}/url?preview=${attachment.mimeType.startsWith("image/")}`);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (cause) { setError(errorMessage(cause, "Không thể mở tệp đính kèm")); }
  }

  async function sendMessage() {
    const text = content.trim();
    if ((!text && !files.length) || sending) return;
    const socket = socketRef.current;
    if (!socket?.connected) { setError("Kênh chat đang mất kết nối. Vui lòng thử lại sau giây lát."); return; }
    setSending(true);
    setError("");
    try {
      const uploaded = [] as Array<{ fileName: string; contentType: string; size: number; s3Key: string }>;
      for (const pending of files) {
        setFiles((current) => current.map((item) => item.id === pending.id ? { ...item, status: "uploading" } : item));
        const session = await authenticatedRequest<{ s3Key: string; uploadUrl: string }>(`/classes/${encodeURIComponent(classId)}/chat/attachments/upload-url`, {
          method: "POST",
          body: JSON.stringify({ fileName: pending.file.name, contentType: pending.file.type || "application/octet-stream", size: pending.file.size }),
        });
        const upload = await fetch(session.uploadUrl, { method: "PUT", headers: { "Content-Type": pending.file.type || "application/octet-stream" }, body: pending.file });
        if (!upload.ok) throw new Error(`Không thể tải ${pending.file.name} lên`);
        uploaded.push({ fileName: pending.file.name, contentType: pending.file.type || "application/octet-stream", size: pending.file.size, s3Key: session.s3Key });
      }
      await new Promise<void>((resolve, reject) => {
        socket.timeout(15_000).emit("class:message", { classId, content: text, attachments: uploaded }, (timeoutError: Error | null, result: { ok?: boolean; message?: string }) => {
          if (timeoutError) reject(new Error("Gửi tin nhắn quá thời gian chờ"));
          else if (!result?.ok) reject(new Error(result?.message ?? "Không thể gửi tin nhắn"));
          else resolve();
        });
      });
      setContent("");
      setFiles([]);
    } catch (cause) {
      setError(errorMessage(cause, "Không thể gửi tin nhắn"));
      setFiles((current) => current.map((item) => ({ ...item, status: "pending" })));
    } finally { setSending(false); }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div><h2 className="font-black text-slate-900">Trao đổi lớp</h2><p className="mt-0.5 text-xs text-slate-500">{className ? `${className} · ` : ""}Giáo viên và học sinh trong lớp</p></div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{connected ? "Trực tuyến" : "Đang kết nối"}</span>
      </header>
      {error ? <p className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <div className="h-[390px] space-y-3 overflow-y-auto bg-slate-50/60 p-4">
        {loading ? <div className="grid h-full place-items-center text-sm font-semibold text-slate-500"><span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />Đang tải trò chuyện…</span></div> : null}
        {!loading && !messages.length ? <div className="grid h-full place-items-center text-center text-sm text-slate-500">Chưa có tin nhắn. Hãy bắt đầu trao đổi với lớp.</div> : null}
        {messages.map((message) => {
          const mine = message.sender.id === currentUser?.id;
          return <article key={message.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-black text-brand-700">{message.sender.fullName.trim().charAt(0).toUpperCase()}</span>
            <div className={`max-w-[82%] ${mine ? "items-end" : "items-start"}`}>
              <p className={`mb-1 text-xs font-bold text-slate-600 ${mine ? "text-right" : ""}`}>{message.sender.fullName}</p>
              <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "rounded-tr-sm bg-brand-600 text-white" : "rounded-tl-sm border border-slate-100 bg-white text-slate-800"}`}>
                {message.content ? <p className="whitespace-pre-wrap break-words">{message.content}</p> : null}
                {message.attachments.length ? <div className={`${message.content ? "mt-2" : ""} space-y-1.5`}>{message.attachments.map((attachment) => <button key={attachment.id} type="button" onClick={() => void openAttachment(attachment)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold ${mine ? "bg-white/15 hover:bg-white/25" : "bg-slate-50 hover:bg-slate-100"}`}><span>{attachment.mimeType.startsWith("image/") ? <FileImage className="size-4" /> : <FileText className="size-4" />}</span><span className="min-w-0 flex-1 truncate">{attachment.originalName}</span><span className="shrink-0 opacity-75">{formatSize(attachment.size)}</span></button>)}</div> : null}
              </div>
              <p className={`mt-1 text-[11px] text-slate-400 ${mine ? "text-right" : ""}`}>{formatTime(message.createdAt)}</p>
            </div>
          </article>;
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-slate-100 p-3">
        {files.length ? <div className="mb-2 flex flex-wrap gap-2">{files.map((item) => <span key={item.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-brand-700"><FileText className="size-3.5 shrink-0" /><span className="max-w-40 truncate">{item.file.name}</span>{item.status === "uploading" ? <LoaderCircle className="size-3.5 animate-spin" /> : <button type="button" onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))} aria-label={`Bỏ ${item.file.name}`}><X className="size-3.5" /></button>}</span>)}</div> : null}
        <div className="flex items-end gap-2">
          <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-brand-600"><Paperclip className="size-4" /><input type="file" multiple className="hidden" onChange={(event) => { pickFiles(event.target.files); event.currentTarget.value = ""; }} /></label>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} maxLength={2000} rows={2} placeholder="Nhập tin nhắn… (Enter để gửi, Shift + Enter xuống dòng)" className="min-h-10 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-blue-100" />
          <Button className="h-10 shrink-0 !rounded-xl" aria-label="Gửi tin nhắn" disabled={sending || (!content.trim() && !files.length)} onClick={() => void sendMessage()}>{sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}<span className="hidden sm:inline">Gửi</span></Button>
        </div>
      </div>
    </section>
  );
}
