import { authenticatedRequest } from "@/lib/auth-api";
import type {
  Exam,
  ExamAttempt,
  ExamInput,
  ExamAnswer,
  AcademicYear,
  ClassRoster,
  GradeComponent,
  SchoolClass,
  Question,
  QuestionFilters,
  QuestionInput,
  Subject,
  SubjectTeacherAssignment,
  TeacherAssignedClass,
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
  TeacherDifficultySettings,
} from "@/types/assessment";

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
  getSubjects(includeInactive = false): Promise<Subject[]> {
    return authenticatedRequest<Subject[]>(`/subjects${includeInactive ? "?includeInactive=true" : ""}`);
  },
  getClasses(academicYearId?: string, includeInactive = false): Promise<SchoolClass[]> {
    const params = new URLSearchParams();
    if (academicYearId) params.set("academicYearId", academicYearId);
    if (includeInactive) params.set("includeInactive", "true");
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
  createSubject(payload: Pick<Subject, "code" | "name"> & { description?: string }): Promise<Subject> {
    return authenticatedRequest<Subject>("/subjects", { method: "POST", body: JSON.stringify(payload) });
  },
  updateSubject(id: string, payload: Partial<Pick<Subject, "code" | "name" | "description" | "isActive">>): Promise<Subject> {
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
  getAvailableStudents(classId: string): Promise<ClassRoster["students"]> {
    return authenticatedRequest<ClassRoster["students"]>(`/classes/${encodeURIComponent(classId)}/available-students`);
  },
  assignClassTeacher(classId: string, userId: string): Promise<Record<string, unknown>> {
    return authenticatedRequest<Record<string, unknown>>(`/classes/${encodeURIComponent(classId)}/teachers`, { method: "POST", body: JSON.stringify({ userId }) });
  },
  removeClassTeacher(classId: string, teacherId: string): Promise<Record<string, unknown>> {
    return authenticatedRequest<Record<string, unknown>>(`/classes/${encodeURIComponent(classId)}/teachers/${encodeURIComponent(teacherId)}`, { method: "DELETE" });
  },
  assignClassStudent(classId: string, userId: string): Promise<Record<string, unknown>> {
    return authenticatedRequest<Record<string, unknown>>(`/classes/${encodeURIComponent(classId)}/students`, { method: "POST", body: JSON.stringify({ userId }) });
  },
  removeClassStudent(classId: string, studentId: string): Promise<Record<string, unknown>> {
    return authenticatedRequest<Record<string, unknown>>(`/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`, { method: "DELETE" });
  },
  getSubjectTeacherAssignments(filters: { classId?: string; subjectId?: string; teacherId?: string } = {}): Promise<SubjectTeacherAssignment[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    const query = params.toString();
    return authenticatedRequest<SubjectTeacherAssignment[]>(`/subject-teacher-assignments${query ? `?${query}` : ""}`);
  },
  getTeacherAssignedClasses(): Promise<TeacherAssignedClass[]> {
    return authenticatedRequest<TeacherAssignedClass[]>("/teacher/assigned-classes");
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
  updateQuestion(id: string, payload: QuestionInput): Promise<Question> {
    return authenticatedRequest<Question>(`/question-bank/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  deleteQuestion(id: string): Promise<Record<string, never>> {
    return authenticatedRequest<Record<string, never>>(`/question-bank/${encodeURIComponent(id)}`, { method: "DELETE" });
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
  updateSystem(levels: DifficultyLevelDefinition[]): Promise<SystemDifficultySettings> {
    return authenticatedRequest<SystemDifficultySettings>("/ai-question-settings/system", {
      method: "PUT",
      body: JSON.stringify({ levels }),
    });
  },
  getMine(): Promise<TeacherDifficultySettings> {
    return authenticatedRequest<TeacherDifficultySettings>("/ai-question-settings/me");
  },
  updateMine(levels: DifficultyLevelDefinition[]): Promise<TeacherDifficultySettings> {
    return authenticatedRequest<TeacherDifficultySettings>("/ai-question-settings/me", {
      method: "PUT",
      body: JSON.stringify({ levels }),
    });
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
  saveAnswer(id: string, answer: ExamAnswer, keepalive = false): Promise<ExamAttempt> {
    return authenticatedRequest<ExamAttempt>(`/exam-attempts/${encodeURIComponent(id)}/answers`, {
      method: "PATCH",
      body: JSON.stringify(answer),
      keepalive,
    });
  },
  submitExam(id: string): Promise<ExamAttempt> {
    return authenticatedRequest<ExamAttempt>(`/exam-attempts/${encodeURIComponent(id)}/submit`, { method: "POST" });
  },
};
