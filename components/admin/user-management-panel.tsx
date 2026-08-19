"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, LoaderCircle, Pencil, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableLoadingBarRow,
} from "@/components/ui/data-table";
import { DataTableFooter } from "@/components/ui/data-table-footer";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { CustomSelect, Input } from "@/components/ui/form-control";
import { Modal } from "@/components/ui/modal";
import { ApiError, authenticatedRequest } from "@/lib/auth-api";
import { useActionNotification } from "@/components/ui/action-notification";
import type { User, UserRole, UserStatus } from "@/types/auth";
import type { UsersPage } from "@/types/users";

type ManagedRole = Extract<UserRole, "TEACHER" | "STUDENT">;

const roleLabels: Record<ManagedRole, string> = {
  TEACHER: "Giáo viên",
  STUDENT: "Học sinh",
};

const roleFilterOptions = [
  { value: "", label: "Tất cả đối tượng" },
  { value: "TEACHER", label: "Giáo viên" },
  { value: "STUDENT", label: "Học sinh" },
];

const statusFilterOptions = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ đăng nhập" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "LOCKED", label: "Đã khóa" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
];

const statusLabels: Record<UserStatus, string> = {
  PENDING: "Chờ đăng nhập",
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa",
  INACTIVE: "Ngừng hoạt động",
};

function formatDate(value: string | null): string {
  if (!value) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitial(fullName: string): string {
  return fullName.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? "?";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  return error.details.length > 0 ? error.details.join(" · ") : error.message;
}

function getStatusClass(status: UserStatus): string {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "LOCKED") return "bg-rose-50 text-rose-700";
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export function UserManagementPanel() {
  const { notify } = useActionNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const buildQuery = useCallback(
    () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      params.set("excludeRole", "ADMIN");
      if (submittedSearch) params.set("search", submittedSearch);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (createdFrom) params.set("createdFrom", createdFrom);
      if (createdTo) params.set("createdTo", createdTo);
      return params;
    },
    [createdFrom, createdTo, limit, page, roleFilter, statusFilter, submittedSearch],
  );

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const result = await authenticatedRequest<UsersPage>(
        `/users?${buildQuery().toString()}`,
      );
      setUsers(result.items);
      setTotalUsers(result.meta.total);
      setTotalPages(Math.max(result.meta.totalPages, 1));
    } catch (error) {
      setListError(getErrorMessage(error, "Không thể tải danh sách người dùng"));
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openEditor(user: User) {
    setViewedUser(null);
    setSelectedUser(user);
    setFullName(user.fullName);
    setAccountName(user.accountName);
    setAvatarUrl(user.avatarUrl ?? "");
    setEditError("");
  }

  function openViewer(user: User) {
    setViewedUser(user);
  }

  function closeEditor() {
    if (isSaving) return;
    setSelectedUser(null);
    setEditError("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;

    setEditError("");
    setIsSaving(true);
    try {
      await authenticatedRequest<User>(
        `/users/${encodeURIComponent(selectedUser.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fullName: fullName.trim(),
            accountName: accountName.trim().toLowerCase(),
            avatarUrl: avatarUrl.trim() || null,
          }),
        },
      );
      setSelectedUser(null);
      notify("Đã cập nhật thông tin người dùng", {
        key: "user-information-updated",
      });
      await loadUsers();
    } catch (error) {
      setEditError(getErrorMessage(error, "Không thể cập nhật thông tin người dùng"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-card">
        <div className="grid gap-3 xl:grid-cols-[minmax(220px,360px)_180px_190px_230px]">
          <DebouncedSearchInput
            className="!h-[42px] !rounded-lg focus:!ring-0"
            value={search}
            onValueChange={setSearch}
            onSearch={(value) => {
              setPage(1);
              setSubmittedSearch(value);
            }}
            placeholder="Tìm theo họ tên hoặc mã người dùng"
          />
          <CustomSelect
            value={roleFilter}
            options={roleFilterOptions}
            buttonClassName="!h-[42px] !rounded-lg !ring-0"
            ariaLabel="Lọc theo đối tượng"
            onValueChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
          />
          <CustomSelect
            value={statusFilter}
            options={statusFilterOptions}
            buttonClassName="!h-[42px] !rounded-lg !ring-0"
            ariaLabel="Lọc theo trạng thái"
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          />
          <DateRangePicker
            from={createdFrom}
            to={createdTo}
            buttonClassName="!h-[42px] !rounded-lg"
            onChange={(value) => {
              setCreatedFrom(value.from);
              setCreatedTo(value.to);
              setPage(1);
            }}
          />
        </div>
      </div>

      <section className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
        {listError ? (
          <p className="m-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            <XCircle className="size-4" /> {listError}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <Table className="min-w-[1020px]">
            <TableHeader className="!bg-brand-600 !text-white">
              <tr>
                <TableHead className="w-14 text-center">#</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Mã người dùng</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Lần đăng nhập cuối</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableLoadingBarRow colSpan={7} /> : null}
              {!isLoading && users.length === 0 ? (
                <TableEmptyRow colSpan={7} message="Không có người dùng phù hợp." />
              ) : (
                users.map((user, index) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/70">
                    <TableCell className="text-center text-xs text-slate-400">
                      {(page - 1) * limit + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-brand-700">
                          {getInitial(user.fullName)}
                        </span>
                        <span className="font-bold text-slate-900">{user.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-brand-700">
                      {user.accountName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.role === "TEACHER"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        {roleLabels[user.role as ManagedRole]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(user.status)}`}
                      >
                        {statusLabels[user.status]}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-9 !rounded-lg px-0 text-slate-500 hover:bg-blue-50 hover:text-brand-700"
                          onClick={() => openViewer(user)}
                          aria-label={`Xem thông tin ${user.fullName}`}
                          title="Xem thông tin"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-9 !rounded-lg px-0 text-brand-700 hover:bg-blue-50"
                          onClick={() => openEditor(user)}
                          aria-label={`Chỉnh sửa thông tin ${user.fullName}`}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DataTableFooter
          rowCount={users.length}
          totalItems={totalUsers}
          itemLabel="người dùng"
          page={page}
          totalPages={totalPages}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(pageSize) => {
            setLimit(pageSize);
            setPage(1);
          }}
        />
      </section>

      <Modal
        open={viewedUser !== null}
        title="Thông tin người dùng"
        description="Thông tin cơ bản của giáo viên hoặc học sinh."
        onClose={() => setViewedUser(null)}
        width="max-w-xl"
      >
        {viewedUser ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-50 text-base font-bold text-brand-700">
                {getInitial(viewedUser.fullName)}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-extrabold text-slate-950">
                  {viewedUser.fullName}
                </h3>
                <p className="font-mono text-xs font-semibold text-brand-700">
                  {viewedUser.accountName}
                </p>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Đối tượng</p>
                <p className="mt-1 font-bold text-slate-800">
                  {roleLabels[viewedUser.role as ManagedRole]}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Trạng thái</p>
                <p className="mt-1 font-bold text-slate-800">
                  {statusLabels[viewedUser.status]}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Ngày tạo</p>
                <p className="mt-1 font-bold text-slate-800">
                  {formatDate(viewedUser.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Lần đăng nhập cuối</p>
                <p className="mt-1 font-bold text-slate-800">
                  {formatDate(viewedUser.lastLoginAt)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="!rounded-lg"
                onClick={() => setViewedUser(null)}
              >
                Đóng
              </Button>
              <Button
                className="!rounded-lg"
                onClick={() => openEditor(viewedUser)}
              >
                <Pencil className="size-4" /> Chỉnh sửa
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={selectedUser !== null}
        title="Cập nhật thông tin người dùng"
        description="Chỉnh sửa thông tin cơ bản của giáo viên hoặc học sinh."
        onClose={closeEditor}
        width="max-w-xl"
      >
        <form className="space-y-4" onSubmit={(event) => void handleSave(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              className="!rounded-lg"
              label="Họ và tên"
              required
              minLength={2}
              maxLength={150}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nhập họ và tên"
            />
            <Input
              className="!rounded-lg"
              label="Mã người dùng"
              required
              minLength={3}
              maxLength={50}
              value={accountName}
              onChange={(event) => setAccountName(event.target.value.toLowerCase())}
              placeholder="Nhập mã người dùng"
            />
          </div>

          <Input
            className="!rounded-lg"
            label="Ảnh đại diện"
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
            hint="Có thể để trống nếu chưa có ảnh đại diện."
          />

          {selectedUser ? (
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-400">Đối tượng</p>
                <p className="mt-1 font-bold text-slate-800">
                  {roleLabels[selectedUser.role as ManagedRole]}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Trạng thái tài khoản</p>
                <p className="mt-1 font-bold text-slate-800">
                  {statusLabels[selectedUser.status]}
                </p>
              </div>
            </div>
          ) : null}

          {editError ? (
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{editError}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="!rounded-lg"
              disabled={isSaving}
              onClick={closeEditor}
            >
              Hủy
            </Button>
            <Button type="submit" className="!rounded-lg" disabled={isSaving}>
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Lưu thông tin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
