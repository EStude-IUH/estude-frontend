import { authenticatedRequest } from "./auth-api";
import type {
  Gradebook,
  GradebookView,
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
  report(studentId = "me") {
    return authenticatedRequest<GradeReport>(
      `/gradebooks/students/${encodeURIComponent(studentId)}`,
    );
  },
};
