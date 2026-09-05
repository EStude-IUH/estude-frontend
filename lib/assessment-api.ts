import {
  authenticatedBlobRequest,
  authenticatedRequest,
  authenticatedUploadRequest,
  type UploadProgressPhase,
} from "@/lib/auth-api";
import type {
  Exam,
  ExamAttempt,
  ExamInput,
  ExamAnswer,
  AcademicYear,
  ClassRoster,
  AvailableStudentsPage,
  GradeComponent,
  SchoolClass,
  Question,
  QuestionFilters,
  QuestionInput,
  BulkMoveQuestionsInput,
  BulkMoveQuestionsResult,
  Subject,
  SubjectImportResult,
  SubjectTeacherAssignment,
  StudentCourse,
  StudentCourseDetail,
  TeacherAssignedClass,
  TeacherManagedStudent,
  ClassTopic,
  ClassTopicInput,
  LearningMaterial,
  MaterialAssignmentTarget,
  BulkMaterialAssignmentResult,
  Term,
  Topic,
  GeneratedQuestion,
  GenerateAiQuestionsInput,
  UpdateGeneratedQuestionInput,
  DifficultyLevelDefinition,
  SystemDifficultySettings,
  StudyAnalysis,
  StudyPracticeSet,
  TeacherDifficultySettings,
  TeacherExamDefaults,
  TeacherExamDefaultSettings,
} from "@/types/assessment";
import type { StudentOverview } from "@/types/student-overview";

export const academicDataService = {
  getAcademicYears(includeInactive = false): Promise<AcademicYear[]> {
    return authenticatedRequest<AcademicYear[]>(`/academic-years${includeInactive ? "?includeInactive=true" : ""}`);
  },
  getTerms(academicYearId?: string, includeInactive = false): Promise<Term[]> {
    const params = new URLSearchParams();
    if (academicYearId) params.set("academicYearId", academicYearId);
    if (includeInactive) params.set("includeInactive", "true");
    const query = params.toString();
    return authenticatedRequest<Term[]>(`/terms${query ? `?${query}` : ""}`);
  },
  getSubjects(includeInactive = false, search?: string, limit?: number): Promise<Subject[]> {
    const params = new URLSearchParams();
    if (includeInactive) params.set("includeInactive", "true");
    if (search?.trim()) params.set("search", search.trim());
    if (limit) params.set("limit", String(limit));
    const query = params.toString();
    return authenticatedRequest<Subject[]>(`/subjects${query ? `?${query}` : ""}`);
  },
  downloadSubjectImportTemplate(): Promise<Blob> {
    return authenticatedBlobRequest("/subjects/import-template");
  },
  importSubjects(
    file: File,
    onProgress: (percent: number, phase: UploadProgressPhase) => void,
  ): Promise<SubjectImportResult> {
    const formData = new FormData();
    formData.append("file", file);
    return authenticatedUploadRequest<SubjectImportResult>(
      "/subjects/import",
      formData,
      onProgress,
    );
  },
  getClasses(academicYearId?: string, includeInactive = false, search?: string, limit?: number): Promise<SchoolClass[]> {
    const params = new URLSearchParams();
    if (academicYearId) params.set("academicYearId", academicYearId);
    if (includeInactive) params.set("includeInactive", "true");
    if (search?.trim()) params.set("search", search.trim());
    if (limit) params.set("limit", String(limit));
    const query = params.toString();
    return authenticatedRequest<SchoolClass[]>(`/classes${query ? `?${query}` : ""}`);
  },
  getTopics(subjectId?: string): Promise<Topic[]> {
    const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "";
    return authenticatedRequest<Topic[]>(`/topics${query}`);
  },
  createAcademicYear(payload: Pick<AcademicYear, "name" | "startsAt" | "endsAt" | "status">): Promise<AcademicYear> {
    return authenticatedRequest<AcademicYear>("/academic-years", { method: "POST", body: JSON.stringify(payload) });
  },
  updateAcademicYear(id: string, payload: Partial<Pick<AcademicYear, "name" | "startsAt" | "endsAt" | "status">>): Promise<AcademicYear> {
    return authenticatedRequest<AcademicYear>(`/academic-years/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteAcademicYear(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/academic-years/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  createTerm(payload: Pick<Term, "academicYearId" | "name" | "startsAt" | "endsAt" | "displayOrder" | "status">): Promise<Term> {
    return authenticatedRequest<Term>("/terms", { method: "POST", body: JSON.stringify(payload) });
  },
  updateTerm(id: string, payload: Partial<Pick<Term, "academicYearId" | "name" | "startsAt" | "endsAt" | "displayOrder" | "status">>): Promise<Term> {
    return authenticatedRequest<Term>(`/terms/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteTerm(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/terms/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  createSubject(payload: Pick<Subject, "code" | "name"> & { vietnameseName: string; description?: string }): Promise<Subject> {
    return authenticatedRequest<Subject>("/subjects", { method: "POST", body: JSON.stringify(payload) });
  },
  updateSubject(id: string, payload: Partial<Pick<Subject, "code" | "name" | "vietnameseName" | "description" | "isActive">>): Promise<Subject> {
    return authenticatedRequest<Subject>(`/subjects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteSubject(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/subjects/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  getGradeComponents(filters: { subjectId?: string; includeInactive?: boolean } = {}): Promise<GradeComponent[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, String(value)); });
    const query = params.toString();
    return authenticatedRequest<GradeComponent[]>(`/grade-components${query ? `?${query}` : ""}`);
  },
  createGradeComponent(payload: Omit<GradeComponent, "id" | "isActive" | "deletedAt"> & { isActive?: boolean }): Promise<GradeComponent> {
    return authenticatedRequest<GradeComponent>("/grade-components", { method: "POST", body: JSON.stringify(payload) });
  },
  updateGradeComponent(id: string, payload: Partial<Pick<GradeComponent, "code" | "name" | "requiredColumns" | "weight" | "teacherCanConfigureCalculation" | "sortOrder" | "isActive">>): Promise<GradeComponent> {
    return authenticatedRequest<GradeComponent>(`/grade-components/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteGradeComponent(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/grade-components/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  validateGradeConfiguration(subjectId: string): Promise<{ subjectId: string; totalWeight: number; valid: true }> {
    return authenticatedRequest<{ subjectId: string; totalWeight: number; valid: true }>("/grade-components/validate", { method: "POST", body: JSON.stringify({ subjectId }) });
  },
  createClass(payload: Pick<SchoolClass, "academicYearId" | "code" | "name" | "isActive">): Promise<SchoolClass> {
    return authenticatedRequest<SchoolClass>("/classes", { method: "POST", body: JSON.stringify(payload) });
  },
  updateClass(id: string, payload: Partial<Pick<SchoolClass, "academicYearId" | "code" | "name" | "isActive">>): Promise<SchoolClass> {
    return authenticatedRequest<SchoolClass>(`/classes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteClass(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/classes/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  getClassRoster(classId: string): Promise<ClassRoster> {
    return authenticatedRequest<ClassRoster>(`/classes/${encodeURIComponent(classId)}/roster`);
  },
  getAvailableStudents(
    classId: string,
    filters: { offset?: number; limit?: number; search?: string } = {},
  ): Promise<AvailableStudentsPage> {
    const params = new URLSearchParams({
      offset: String(filters.offset ?? 0),
      limit: String(filters.limit ?? 20),
    });
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    return authenticatedRequest<AvailableStudentsPage>(`/classes/${encodeURIComponent(classId)}/available-students?${params.toString()}`);
  },
  assignClassStudent(classId: string, userId: string): Promise<Record<string, unknown>> {
    return authenticatedRequest<Record<string, unknown>>(`/classes/${encodeURIComponent(classId)}/students`, { method: "POST", body: JSON.stringify({ userId }) });
  },
  removeClassStudent(classId: string, studentId: string): Promise<Record<string, unknown>> {
    return authenticatedRequest<Record<string, unknown>>(`/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`, { method: "DELETE" });
  },
  getSubjectTeacherAssignments(filters: { classId?: string; subjectId?: string; teacherId?: string; search?: string } = {}): Promise<SubjectTeacherAssignment[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    const query = params.toString();
    return authenticatedRequest<SubjectTeacherAssignment[]>(`/subject-teacher-assignments${query ? `?${query}` : ""}`);
  },
  getTeacherAssignedClasses(): Promise<TeacherAssignedClass[]> {
    return authenticatedRequest<TeacherAssignedClass[]>("/teacher/assigned-classes");
  },
  getTeacherManagedStudents(): Promise<TeacherManagedStudent[]> {
    return authenticatedRequest<TeacherManagedStudent[]>("/teacher/students");
  },
  getStudentCourses(): Promise<StudentCourse[]> {
    return authenticatedRequest<StudentCourse[]>("/student/courses");
  },
  getStudentCourse(classId: string, subjectId: string): Promise<StudentCourseDetail> {
    return authenticatedRequest<StudentCourseDetail>(
      `/student/courses/${encodeURIComponent(classId)}/${encodeURIComponent(subjectId)}`,
    );
  },
  getStudentMaterialDownloadUrl(materialId: string): Promise<{ url: string; expiresIn: number }> {
    return authenticatedRequest<{ url: string; expiresIn: number }>(
      `/student/materials/${encodeURIComponent(materialId)}/download-url`,
    );
  },
  getStudentMaterialPreviewUrl(materialId: string): Promise<{ url: string; expiresIn: number }> {
    return authenticatedRequest<{ url: string; expiresIn: number }>(
      `/student/materials/${encodeURIComponent(materialId)}/preview-url`,
    );
  },
  getTeacherAssignedClass(classId: string): Promise<TeacherAssignedClass> {
    return authenticatedRequest<TeacherAssignedClass>(`/teacher/assigned-classes/${encodeURIComponent(classId)}`);
  },
  getClassTopics(classId: string): Promise<ClassTopic[]> {
    return authenticatedRequest<ClassTopic[]>(`/teacher/assigned-classes/${encodeURIComponent(classId)}/topics`);
  },
  createClassTopic(classId: string, payload: ClassTopicInput): Promise<ClassTopic> {
    return authenticatedRequest<ClassTopic>(`/teacher/assigned-classes/${encodeURIComponent(classId)}/topics`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateClassTopic(topicId: string, payload: Partial<Omit<ClassTopicInput, "subjectId">>): Promise<ClassTopic> {
    return authenticatedRequest<ClassTopic>(`/teacher/class-topics/${encodeURIComponent(topicId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteClassTopic(topicId: string): Promise<ClassTopic> {
    return authenticatedRequest<ClassTopic>(`/teacher/class-topics/${encodeURIComponent(topicId)}`, { method: "DELETE" });
  },
  async uploadClassMaterial(topicId: string, file: File): Promise<LearningMaterial> {
    const contentType = file.type || "application/octet-stream";
    const session = await authenticatedRequest<{
      material: LearningMaterial;
      uploadUrl: string;
      method: "PUT";
      expiresIn: number;
    }>(`/teacher/class-topics/${encodeURIComponent(topicId)}/materials/upload-url`, {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }),
    });
    const uploadResponse = await fetch(session.uploadUrl, {
      method: session.method,
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error("Không thể tải tài liệu lên S3");
    return authenticatedRequest<LearningMaterial>(`/teacher/materials/${encodeURIComponent(session.material.id)}/confirm`, { method: "POST" });
  },
  getMaterialLibrary(): Promise<LearningMaterial[]> {
    return authenticatedRequest<LearningMaterial[]>("/teacher/material-library");
  },
  async uploadLibraryMaterial(file: File): Promise<LearningMaterial> {
    const contentType = file.type || "application/octet-stream";
    const session = await authenticatedRequest<{
      material: LearningMaterial;
      uploadUrl: string;
      method: "PUT";
      expiresIn: number;
    }>("/teacher/material-library/upload-url", {
      method: "POST",
      body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }),
    });
    const uploadResponse = await fetch(session.uploadUrl, {
      method: session.method,
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!uploadResponse.ok) throw new Error("Không thể tải tài liệu lên S3");
    return authenticatedRequest<LearningMaterial>(`/teacher/materials/${encodeURIComponent(session.material.id)}/confirm`, { method: "POST" });
  },
  bulkAssignMaterials(materialIds: string[], targets: MaterialAssignmentTarget[]): Promise<BulkMaterialAssignmentResult> {
    return authenticatedRequest<BulkMaterialAssignmentResult>("/teacher/material-library/assign", {
      method: "POST",
      body: JSON.stringify({ materialIds, targets }),
    });
  },
  removeMaterialFromTopic(topicId: string, materialId: string): Promise<{ topicId: string; materialId: string }> {
    return authenticatedRequest<{ topicId: string; materialId: string }>(`/teacher/class-topics/${encodeURIComponent(topicId)}/materials/${encodeURIComponent(materialId)}`, { method: "DELETE" });
  },
  getMaterialDownloadUrl(materialId: string): Promise<{ url: string; expiresIn: number }> {
    return authenticatedRequest<{ url: string; expiresIn: number }>(`/teacher/materials/${encodeURIComponent(materialId)}/download-url`);
  },
  getMaterialPreviewUrl(materialId: string): Promise<{ url: string; expiresIn: number }> {
    return authenticatedRequest<{ url: string; expiresIn: number }>(`/teacher/materials/${encodeURIComponent(materialId)}/preview-url`);
  },
  deleteLearningMaterial(materialId: string): Promise<LearningMaterial> {
    return authenticatedRequest<LearningMaterial>(`/teacher/materials/${encodeURIComponent(materialId)}`, { method: "DELETE" });
  },
  getTeacherAssignedClassRoster(classId: string): Promise<ClassRoster> {
    return authenticatedRequest<ClassRoster>(`/teacher/assigned-classes/${encodeURIComponent(classId)}/roster`);
  },
  createSubjectTeacherAssignment(payload: Pick<SubjectTeacherAssignment, "classId" | "subjectId" | "teacherId">): Promise<SubjectTeacherAssignment> {
    return authenticatedRequest<SubjectTeacherAssignment>("/subject-teacher-assignments", { method: "POST", body: JSON.stringify(payload) });
  },
  updateSubjectTeacherAssignment(id: string, payload: Partial<Pick<SubjectTeacherAssignment, "classId" | "subjectId" | "teacherId" | "isActive">>): Promise<SubjectTeacherAssignment> {
    return authenticatedRequest<SubjectTeacherAssignment>(`/subject-teacher-assignments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteSubjectTeacherAssignment(id: string): Promise<SubjectTeacherAssignment> {
    return authenticatedRequest<SubjectTeacherAssignment>(`/subject-teacher-assignments/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  createTopic(payload: Pick<Topic, "subjectId" | "name"> & { description?: string }): Promise<Topic> {
    return authenticatedRequest<Topic>("/topics", { method: "POST", body: JSON.stringify(payload) });
  },
};

export const questionBankService = {
  getQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    const query = params.toString();
    return authenticatedRequest<Question[]>(`/question-bank${query ? `?${query}` : ""}`);
  },
  getQuestionById(id: string): Promise<Question> {
    return authenticatedRequest<Question>(`/question-bank/${encodeURIComponent(id)}`);
  },
  createQuestion(payload: QuestionInput): Promise<Question> {
    return authenticatedRequest<Question>("/question-bank", { method: "POST", body: JSON.stringify(payload) });
  },
  updateQuestion(id: string, payload: Partial<QuestionInput>): Promise<Question> {
    return authenticatedRequest<Question>(`/question-bank/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteQuestion(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/question-bank/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  moveQuestionsToTopic(payload: BulkMoveQuestionsInput): Promise<BulkMoveQuestionsResult> {
    return authenticatedRequest<BulkMoveQuestionsResult>("/question-bank/move-topic", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const aiQuestionService = {
  generate(payload: GenerateAiQuestionsInput): Promise<GeneratedQuestion[]> {
    return authenticatedRequest<GeneratedQuestion[]>("/ai-questions/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: UpdateGeneratedQuestionInput): Promise<GeneratedQuestion> {
    return authenticatedRequest<GeneratedQuestion>(`/ai-questions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  regenerate(id: string): Promise<GeneratedQuestion> {
    return authenticatedRequest<GeneratedQuestion>(`/ai-questions/${encodeURIComponent(id)}/regenerate`, {
      method: "POST",
    });
  },
  approve(id: string): Promise<{ generatedQuestion: GeneratedQuestion; question: Question }> {
    return authenticatedRequest<{ generatedQuestion: GeneratedQuestion; question: Question }>(
      `/ai-questions/${encodeURIComponent(id)}/approve`,
      { method: "POST" },
    );
  },
  reject(id: string): Promise<GeneratedQuestion> {
    return authenticatedRequest<GeneratedQuestion>(`/ai-questions/${encodeURIComponent(id)}/reject`, {
      method: "POST",
    });
  },
};

export const aiQuestionSettingsService = {
  getSystem(): Promise<SystemDifficultySettings> {
    return authenticatedRequest<SystemDifficultySettings>("/ai-question-settings/system");
  },
  updateSystem(
    levels: DifficultyLevelDefinition[],
    maxQuestionsPerGeneration: number,
  ): Promise<SystemDifficultySettings> {
    return authenticatedRequest<SystemDifficultySettings>("/ai-question-settings/system", {
      method: "PUT",
      body: JSON.stringify({ levels, maxQuestionsPerGeneration }),
    });
  },
  getMine(): Promise<TeacherDifficultySettings> {
    return authenticatedRequest<TeacherDifficultySettings>("/ai-question-settings/me");
  },
  updateMine(settings: {
    levels?: DifficultyLevelDefinition[];
    defaultQuantity?: number;
  }): Promise<TeacherDifficultySettings> {
    return authenticatedRequest<TeacherDifficultySettings>("/ai-question-settings/me", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  },
};

export const studentOverviewService = {
  getMyOverview(): Promise<StudentOverview> {
    return authenticatedRequest<StudentOverview>("/users/me/student-overview");
  },
};

export const teacherSettingsService = {
  getExamDefaults(): Promise<TeacherExamDefaultSettings> {
    return authenticatedRequest<TeacherExamDefaultSettings>(
      "/teacher-settings/exam-defaults",
    );
  },
  updateExamDefaults(
    examDefaults: TeacherExamDefaults,
  ): Promise<TeacherExamDefaultSettings> {
    return authenticatedRequest<TeacherExamDefaultSettings>(
      "/teacher-settings/exam-defaults",
      {
        method: "PUT",
        body: JSON.stringify(examDefaults),
      },
    );
  },
};

export const examService = {
  getExams(): Promise<Exam[]> {
    return authenticatedRequest<Exam[]>("/exams");
  },
  getExamById(id: string): Promise<Exam> {
    return authenticatedRequest<Exam>(`/exams/${encodeURIComponent(id)}`);
  },
  createExam(payload: ExamInput): Promise<Exam> {
    return authenticatedRequest<Exam>("/exams", { method: "POST", body: JSON.stringify(payload) });
  },
  updateExam(id: string, payload: ExamInput): Promise<Exam> {
    return authenticatedRequest<Exam>(`/exams/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  publishExam(id: string): Promise<Exam> {
    return authenticatedRequest<Exam>(`/exams/${encodeURIComponent(id)}/publish`, { method: "POST" });
  },
  deleteExam(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/exams/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  getSubmissions(id: string): Promise<ExamAttempt[]> {
    return authenticatedRequest<ExamAttempt[]>(`/exams/${encodeURIComponent(id)}/submissions`);
  },
};

export const examAttemptService = {
  startExam(examId: string): Promise<ExamAttempt> {
    return authenticatedRequest<ExamAttempt>(`/exams/${encodeURIComponent(examId)}/attempts`, { method: "POST" });
  },
  getAttempt(id: string): Promise<ExamAttempt & { exam: Exam }> {
    return authenticatedRequest<ExamAttempt & { exam: Exam }>(`/exam-attempts/${encodeURIComponent(id)}`);
  },
  submitExam(id: string, answers: ExamAnswer[]): Promise<ExamAttempt> {
    return authenticatedRequest<ExamAttempt>(`/exam-attempts/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },
  createStudyAnalysis(id: string): Promise<StudyAnalysis> {
    return authenticatedRequest<StudyAnalysis>(
      `/exam-attempts/${encodeURIComponent(id)}/study-analysis`,
      { method: "POST" },
    );
  },
  getStudyAnalysis(id: string): Promise<StudyAnalysis> {
    return authenticatedRequest<StudyAnalysis>(
      `/exam-attempts/${encodeURIComponent(id)}/study-analysis`,
    );
  },
  submitStudyPractice(
    id: string,
    answers: Array<{ questionId: string; selectedOptionIds: string[] }>,
  ): Promise<StudyPracticeSet> {
    return authenticatedRequest<StudyPracticeSet>(
      `/study-practice-sets/${encodeURIComponent(id)}/submit`,
      { method: "POST", body: JSON.stringify({ answers }) },
    );
  },
  retryStudyPractice(id: string): Promise<StudyPracticeSet> {
    return authenticatedRequest<StudyPracticeSet>(
      `/study-practice-sets/${encodeURIComponent(id)}/retry`,
      { method: "POST" },
    );
  },
  getStudyPracticeHint(
    practiceSetId: string,
    questionId: string,
  ): Promise<{ questionId: string; message: string }> {
    return authenticatedRequest<{ questionId: string; message: string }>(
      `/study-practice-sets/${encodeURIComponent(practiceSetId)}/questions/${encodeURIComponent(questionId)}/hint`,
    );
  },
};
