import type { User } from '@/types/auth';

export interface UsersPage {
  items: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ImportUserError {
  row: number;
  accountName?: string;
  message: string;
}

export interface ImportUsersResult {
  totalRows: number;
  createdCount: number;
  failedCount: number;
  errors: ImportUserError[];
}
