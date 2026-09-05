"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, LoaderCircle, Search, Unlink, UserRoundCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DataTableFooter } from "@/components/ui/data-table-footer";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { Table, TableBody, TableCell, TableEmptyRow, TableHead, TableHeader, TableLoadingBarRow } from "@/components/ui/data-table";
import { ApiError, authenticatedRequest } from "@/lib/auth-api";
import { useActionNotification } from "@/components/ui/action-notification";
import type { User } from "@/types/auth";
import type { UsersPage } from "@/types/users";

interface ParentStudentLink {
  id: string;
  parent: User;
  student: User;
  createdAt: string;
}

interface ParentStudentLinksPage {
  items: ParentStudentLink[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  return error.details.length ? error.details.join(" · ") : error.message;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function classLabel(student: User) {
  const assigned = student.assignedClass;
  if (!assigned) return "Chưa xếp lớp";
  return assigned.name && assigned.name !== assigned.code ? `${assigned.code} · ${assigned.name}` : assigned.code || assigned.name;
}

function UserLookup({
  label,
  role,
  value,
  onChange,
}: {
  label: string;
  role: "PARENT" | "STUDENT";
  value: User | null;
  onChange: (user: User | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      const currentRequest = ++requestId.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ role, page: "1", limit: "20" });
        if (query.trim()) params.set("search", query.trim());
        const page = await authenticatedRequest<UsersPage>(`/users?${params.toString()}`);
        if (currentRequest === requestId.current) setResults(page.items);
      } catch {
        if (currentRequest === requestId.current) setResults([]);
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query, role]);

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={open ? query : value ? `${value.fullName} · ${value.accountName}` : ""}
          onFocus={() => { setOpen(true); setQuery(""); }}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          placeholder={`Tìm ${role === "PARENT" ? "phụ huynh" : "học sinh"} theo tên hoặc tài khoản`}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-blue-100"
        />
        {value ? <button type="button" aria-label={`Bỏ chọn ${label.toLowerCase()}`} onClick={() => { onChange(null); setQuery(""); }} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button> : null}
      </div>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {loading ? <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500"><LoaderCircle className="size-4 animate-spin" /> Đang tìm kiếm…</p> : null}
          {!loading && !results.length ? <p className="px-3 py-3 text-sm text-slate-500">Không tìm thấy tài khoản phù hợp.</p> : null}
          {!loading && results.map((user) => (
            <button key={user.id} type="button" onClick={() => { onChange(user); setOpen(false); setQuery(""); }} className="block w-full px-3 py-2.5 text-left hover:bg-blue-50">
              <span className="block text-sm font-semibold text-slate-800">{user.fullName}</span>
              <span className="block text-xs text-slate-500">{user.accountName}{role === "STUDENT" ? ` · ${classLabel(user)}` : ""}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ParentStudentLinksPanel() {
  const { notify } = useActionNotification();
  const [parent, setParent] = useState<User | null>(null);
  const [student, setStudent] = useState<User | null>(null);
  const [links, setLinks] = useState<ParentStudentLink[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [linking, setLinking] = useState(false);
  const [removing, setRemoving] = useState<ParentStudentLink | null>(null);
  const [removingId, setRemovingId] = useState("");

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (submittedSearch) params.set("search", submittedSearch);
      const result = await authenticatedRequest<ParentStudentLinksPage>(`/users/parent-student-links?${params.toString()}`);
      setLinks(result.items);
      setTotal(result.meta.total);
      setTotalPages(Math.max(1, result.meta.totalPages));
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tải danh sách liên kết"));
    } finally {
      setLoading(false);
    }
  }, [limit, page, submittedSearch]);

  useEffect(() => { void loadLinks(); }, [loadLinks]);

  async function createLink() {
    if (!parent || !student) return;
    setLinking(true);
    setError("");
    try {
      await authenticatedRequest<User[]>(`/users/${encodeURIComponent(parent.id)}/children/${encodeURIComponent(student.id)}`, { method: "POST" });
      notify("Đã liên kết phụ huynh với học sinh", { key: "parent-student-link-created" });
      setPage(1);
      setStudent(null);
      await loadLinks();
    } catch (cause) {
      setError(errorMessage(cause, "Không thể tạo liên kết"));
    } finally {
      setLinking(false);
    }
  }

  async function removeLink() {
    if (!removing) return;
    setRemovingId(removing.id);
    setError("");
    try {
      await authenticatedRequest<Record<string, never>>(`/users/${encodeURIComponent(removing.parent.id)}/children/${encodeURIComponent(removing.student.id)}`, { method: "DELETE" });
      notify("Đã hủy liên kết phụ huynh với học sinh", { key: "parent-student-link-removed" });
      setRemoving(null);
      if (links.length === 1 && page > 1) setPage((current) => current - 1);
      else await loadLinks();
    } catch (cause) {
      setError(errorMessage(cause, "Không thể hủy liên kết"));
    } finally {
      setRemovingId("");
    }
  }

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-brand-700"><Link2 className="size-5" /></span><div><h1 className="text-xl font-black text-slate-950">Liên kết phụ huynh – học sinh</h1><p className="mt-1 text-sm leading-6 text-slate-500">Quản lý quan hệ để phụ huynh chỉ xem được thông tin của học sinh đã được nhà trường xác nhận.</p></div></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600"><UsersRound className="size-4" /> {total} liên kết</span>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <UserLookup label="Phụ huynh" role="PARENT" value={parent} onChange={setParent} />
          <UserLookup label="Học sinh" role="STUDENT" value={student} onChange={setStudent} />
          <Button permission="parent_links.assign" disabled={!parent || !student || linking} onClick={() => void createLink()} className="h-11"><Link2 className="size-4" /> {linking ? "Đang liên kết" : "Tạo liên kết"}</Button>
        </div>
        {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black">Danh sách liên kết</h2><p className="mt-1 text-sm text-slate-500">Tìm theo tên hoặc tên tài khoản của phụ huynh, học sinh.</p></div><DebouncedSearchInput value={search} onValueChange={setSearch} onSearch={(value) => { setSubmittedSearch(value); setPage(1); }} placeholder="Tìm phụ huynh hoặc học sinh" className="w-full sm:w-80" /></div>
        <div className="overflow-x-auto"><Table><TableHeader><tr><TableHead>Phụ huynh</TableHead><TableHead>Học sinh</TableHead><TableHead>Lớp học</TableHead><TableHead>Ngày liên kết</TableHead><TableHead className="text-right">Thao tác</TableHead></tr></TableHeader><TableBody>
          {loading ? <TableLoadingBarRow colSpan={5} /> : null}
          {!loading && !links.length ? <TableEmptyRow colSpan={5} message="Chưa có liên kết phù hợp." /> : null}
          {!loading && links.map((link) => <tr key={link.id}><TableCell><p className="font-bold text-slate-800">{link.parent.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{link.parent.accountName}</p></TableCell><TableCell><p className="font-bold text-slate-800">{link.student.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{link.student.accountName}</p></TableCell><TableCell className="text-sm text-slate-600">{classLabel(link.student)}</TableCell><TableCell className="text-sm text-slate-600">{formatDate(link.createdAt)}</TableCell><TableCell className="text-right"><Button permission="parent_links.delete" variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" disabled={Boolean(removingId)} onClick={() => setRemoving(link)}>{removingId === link.id ? <LoaderCircle className="size-4 animate-spin" /> : <Unlink className="size-4" />} Hủy liên kết</Button></TableCell></tr>)}
        </TableBody></Table></div>
        <DataTableFooter rowCount={links.length} totalItems={total} itemLabel="liên kết" page={page} totalPages={totalPages} pageSize={limit} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} />
      </section>
      <ConfirmationDialog open={Boolean(removing)} title="Hủy liên kết phụ huynh – học sinh?" confirmLabel="Hủy liên kết" tone="danger" loading={Boolean(removingId)} onClose={() => !removingId && setRemoving(null)} onConfirm={() => void removeLink()}>Phụ huynh <strong>{removing?.parent.fullName}</strong> sẽ không còn xem được thông tin của học sinh <strong>{removing?.student.fullName}</strong>.</ConfirmationDialog>
    </div>
  );
}
