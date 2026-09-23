import { authenticatedBlobRequest, authenticatedRequest } from "./auth-api";
import type {
  Gradebook,
  GradebookView,
  GradeImportPreview,
  GradeMarks,
  GradePolicy,
  GradeReport,
  GradeScope,
} from "@/types/gradebook";

export const gradebookService = {
  get(scope: GradeScope) {
    return authenticatedRequest<GradebookView>(
      `/gradebooks?${new URLSearchParams({ ...scope })}`,
    );
  },
  configure(input: GradeScope & GradePolicy & { revision: number }) {
    return authenticatedRequest<Gradebook>("/gradebooks/configure", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  save(
    id: string,
    input: {
      studentId: string;
      marks: GradeMarks;
      comment: string;
      revision: number;
    },
  ) {
    return authenticatedRequest(`/gradebooks/${id}/records`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  downloadImportTemplate(id: string): Promise<Blob> {
    return authenticatedBlobRequest(`/gradebooks/${encodeURIComponent(id)}/import-template`);
  },
  previewImport(id: string, file: File): Promise<GradeImportPreview> {
    const formData = new FormData();
    formData.append("file", file);
    return authenticatedRequest<GradeImportPreview>(`/gradebooks/${encodeURIComponent(id)}/import-preview`, {
      method: "POST",
      body: formData,
    });
  },
  saveBulk(id: string, revision: number, records: Array<{ studentId: string; marks: GradeMarks; comment: string }>): Promise<{ count: number; revision: number }> {
    return authenticatedRequest<{ count: number; revision: number }>(`/gradebooks/${encodeURIComponent(id)}/records/bulk`, {
      method: "POST",
      body: JSON.stringify({ revision, records }),
    });
  },
  report(studentId = "me") {
    return authenticatedRequest<GradeReport>(
      `/gradebooks/students/${encodeURIComponent(studentId)}`,
    );
  },
};
