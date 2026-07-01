datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ============================================================
// ENUMS (Chuyển đổi từ CHECK Constraints)
// ============================================================

enum Role {
  ADMIN
  TEACHER
  STUDENT
}

enum UserStatus {
  ACTIVE
  LOCKED
}

enum ExamType {
  PART_PRACTICE
  SKILL_FULL_SET
  MOCK_TEST
}

enum QuestionType {
  MC
  ORDERING
  WORD_BANK
  HEADING_MATCH
  SPEAKER_MATCH
  ESSAY
  RECORD
}

enum AttemptMode {
  PART
  SKILL
  FULL
}

enum AttemptStatus {
  IN_PROGRESS
  SUBMITTED
  EXPIRED
}

enum SectionStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum GradingStatus {
  PENDING
  COMPLETED
  FAILED
}

enum FileType {
  PDF
  VIDEO
}

enum NotificationType {
  SYSTEM
  EXAM_REMINDER
  GRADE_RESULT
}

// ============================================================
// PHÂN HỆ 1: NGƯỜI DÙNG & PHÂN QUYỀN (AUTH & RBAC)
// ============================================================

model User {
  id           String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String        @unique @db.VarChar(255)
  passwordHash String        @map("password_hash") @db.VarChar(255)
  role         Role
  status       UserStatus    @default(ACTIVE)
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamp(6)
  
  // Relations
  profile       UserProfile?
  examAttempts  ExamAttempt[]
  partProgress  StudentPartProgress[]
  skillProgress StudentSkillProgress[]
  learningStreak LearningStreak?
  studyLogs     StudyLog[]
  studyMaterials StudyMaterial[]
  notifications Notification[]

  @@map("users")
}

model UserProfile {
  userId     String    @id @map("user_id") @db.Uuid
  fullName   String    @map("full_name") @db.VarChar(100)
  avatarUrl  String?   @map("avatar_url") @db.Text
  targetDate DateTime? @map("target_date") @db.Date
  aptisGoal  String?   @map("aptis_goal") @db.VarChar(10)
  schoolName String?   @map("school_name") @db.VarChar(255)
  
  // Relations
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

model SystemMenu {
  id        Int          @id @default(autoincrement())
  label     String       @db.VarChar(100)
  path      String       @db.VarChar(255)
  icon      String?      @db.VarChar(50)
  parentId  Int?         @map("parent_id")
  sortOrder Int          @default(0) @map("sort_order")
  
  // Relations
  parent    SystemMenu?      @relation("MenuToMenu", fields: [parentId], references: [id])
  children  SystemMenu[]     @relation("MenuToMenu")
  roleAccess RoleMenuAccess[]

  @@map("system_menus")
}

model RoleMenuAccess {
  role   Role
  menuId Int        @map("menu_id")
  
  // Relations
  menu   SystemMenu @relation(fields: [menuId], references: [id], onDelete: Cascade)

  @@id([role, menuId])
  @@map("role_menu_access")
}

// ============================================================
// PHÂN HỆ 2: NGÂN HÀNG ĐỀ THI (EXAM BANK)
// ============================================================

model Skill {
  id         Int      @id
  name       String   @db.VarChar(50)
  totalParts Int      @map("total_parts")
  
  // Relations
  examSets      ExamSet[]
  examSections  ExamSection[]
  partProgress  StudentPartProgress[]
  skillProgress StudentSkillProgress[]
  studyMaterials StudyMaterial[]

  @@map("skills")
}

model ExamSet {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title       String    @db.VarChar(255)
  description String?   @db.Text
  type        ExamType
  skillId     Int?      @map("skill_id")
  partNumber  Int?      @map("part_number")
  isActive    Boolean   @default(true) @map("is_active")
  deletedAt   DateTime? @map("deleted_at") @db.Timestamp(6)
  
  // Relations
  skill       Skill?        @relation(fields: [skillId], references: [id])
  sections    ExamSection[]
  attempts    ExamAttempt[]

  @@map("exam_sets")
}

model ExamSection {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  examId          String   @map("exam_id") @db.Uuid
  skillId         Int      @map("skill_id")
  durationMinutes Int      @map("duration_minutes")
  orderIndex      Int      @map("order_index")
  
  // Relations
  exam            ExamSet                  @relation(fields: [examId], references: [id], onDelete: Cascade)
  skill           Skill                    @relation(fields: [skillId], references: [id])
  parts           ExamPart[]
  sectionProgress AttemptSectionProgress[]

  @@map("exam_sections")
}

model ExamPart {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sectionId   String   @map("section_id") @db.Uuid
  partNumber  Int      @map("part_number")
  instruction String?  @db.Text
  audioUrl    String?  @map("audio_url") @db.Text
  
  // Relations
  section     ExamSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  questions   Question[]

  @@map("exam_parts")
}

model Question {
  id           String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  partId       String       @map("part_id") @db.Uuid
  content      String?      @db.Text
  mediaUrl     String?      @map("media_url") @db.Text
  questionType QuestionType @map("question_type")
  extraConfig  Json?        @map("extra_config") @db.JsonB
  deletedAt    DateTime?    @map("deleted_at") @db.Timestamp(6)
  
  // Relations
  part         ExamPart         @relation(fields: [partId], references: [id], onDelete: Cascade)
  options      QuestionOption[]
  attemptDetails AttemptDetail[]

  @@index([partId], map: "idx_questions_part")
  @@index([extraConfig], map: "idx_questions_extra_config", type: Gin)
  @@map("questions")
}

model QuestionOption {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  questionId String   @map("question_id") @db.Uuid
  content    String   @db.Text
  isCorrect  Boolean  @map("is_correct")
  
  // Relations
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@map("question_options")
}

// ============================================================
// PHÂN HỆ 3: KẾT QUẢ & CHẤM ĐIỂM AI (GRADES & ATTEMPTS)
// ============================================================

model ExamAttempt {
  id         String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  studentId  String        @map("student_id") @db.Uuid
  examId     String        @map("exam_id") @db.Uuid
  mode       AttemptMode
  status     AttemptStatus @default(IN_PROGRESS)
  totalScore Decimal?      @map("total_score") @db.Decimal(5, 2)
  startedAt  DateTime      @default(now()) @map("started_at") @db.Timestamp(6)
  finishedAt DateTime?     @map("finished_at") @db.Timestamp(6)
  
  // Relations
  student         User                     @relation(fields: [studentId], references: [id])
  exam            ExamSet                  @relation(fields: [examId], references: [id])
  sectionProgress AttemptSectionProgress[]
  details         AttemptDetail[]

  @@index([studentId, status], map: "idx_attempts_student_status")
  @@map("exam_attempts")
}

model AttemptSectionProgress {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  attemptId   String        @map("attempt_id") @db.Uuid
  sectionId   String        @map("section_id") @db.Uuid
  status      SectionStatus @default(NOT_STARTED)
  startedAt   DateTime?     @map("started_at") @db.Timestamp(6)
  completedAt DateTime?     @map("completed_at") @db.Timestamp(6)
  
  // Relations
  attempt     ExamAttempt   @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  section     ExamSection   @relation(fields: [sectionId], references: [id])

  @@map("attempt_section_progress")
}

model AttemptDetail {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  attemptId        String   @map("attempt_id") @db.Uuid
  questionId       String   @map("question_id") @db.Uuid
  questionSnapshot Json     @map("question_snapshot") @db.JsonB
  answerText       String?  @map("answer_text") @db.Text
  answerJson       Json?    @map("answer_json") @db.JsonB
  audioUrl         String?  @map("audio_url") @db.Text
  isCorrect        Boolean? @map("is_correct")
  scoreEarned      Decimal? @map("score_earned") @db.Decimal(5, 2)
  
  // Relations
  attempt          ExamAttempt       @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question         Question          @relation(fields: [questionId], references: [id])
  aiGradingResults AiGradingResult[]

  @@index([attemptId], map: "idx_attempt_details_attempt")
  @@map("attempt_details")
}

model AiGradingResult {
  id                   String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  attemptDetailId      String        @map("attempt_detail_id") @db.Uuid
  gradingStatus        GradingStatus @default(PENDING) @map("grading_status")
  fluencyScore         Decimal?      @map("fluency_score") @db.Decimal(4, 2)
  grammarScore         Decimal?      @map("grammar_score") @db.Decimal(4, 2)
  vocabularyScore      Decimal?      @map("vocabulary_score") @db.Decimal(4, 2)
  coherenceScore       Decimal?      @map("coherence_score") @db.Decimal(4, 2)
  registerScore        Decimal?      @map("register_score") @db.Decimal(4, 2)
  aiFeedback           String?       @map("ai_feedback") @db.Text
  suggestedImprovement String?       @map("suggested_improvement") @db.Text
  
  // Relations
  attemptDetail        AttemptDetail @relation(fields: [attemptDetailId], references: [id], onDelete: Cascade)

  @@index([gradingStatus], map: "idx_ai_grading_status")
  @@map("ai_grading_results")
}

// ============================================================
// PHÂN HỆ 4: TIẾN ĐỘ & PHỤ TRỢ
// ============================================================

model StudentPartProgress {
  studentId         String   @map("student_id") @db.Uuid
  skillId           Int      @map("skill_id")
  partNumber        Int      @map("part_number")
  questionsAnswered Int      @default(0) @map("questions_answered")
  sessionsCount     Int      @default(0) @map("sessions_count")
  lastPracticedAt   DateTime @default(now()) @map("last_practiced_at") @db.Timestamp(6)
  
  // Relations
  student           User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  skill             Skill    @relation(fields: [skillId], references: [id])

  @@id([studentId, skillId, partNumber])
  @@index([studentId, skillId], map: "idx_part_progress_student")
  @@map("student_part_progress")
}

model StudentSkillProgress {
  studentId     String   @map("student_id") @db.Uuid
  skillId       Int      @map("skill_id")
  setsCompleted Int      @default(0) @map("sets_completed")
  overallAvg    Decimal? @map("overall_avg") @db.Decimal(5, 2)
  lastUpdated   DateTime @default(now()) @map("last_updated") @db.Timestamp(6)
  
  // Relations
  student       User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  skill         Skill    @relation(fields: [skillId], references: [id])

  @@id([studentId, skillId])
  @@index([studentId, skillId], map: "idx_skill_progress_student")
  @@map("student_skill_progress")
}

model LearningStreak {
  studentId     String   @id @map("student_id") @db.Uuid
  currentStreak Int      @default(0) @map("current_streak")
  longestStreak Int      @default(0) @map("longest_streak")
  lastActivity  DateTime @default(now()) @map("last_activity") @db.Date
  
  // Relations
  student       User     @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@map("learning_streaks")
}

model StudyLog {
  id           BigInt   @id @default(autoincrement())
  userId       String   @map("user_id") @db.Uuid
  mode         AttemptMode
  minutesSpent Int      @map("minutes_spent")
  activityAt   DateTime @default(now()) @map("activity_at") @db.Timestamp(6)
  
  // Relations
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, activityAt], map: "idx_study_logs_user_date")
  @@map("study_logs")
}

model StudyMaterial {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title           String    @db.VarChar(255)
  fileUrl         String    @map("file_url") @db.Text
  fileType        FileType  @map("file_type")
  durationSeconds Int?      @map("duration_seconds")
  skillId         Int?      @map("skill_id")
  teacherId       String    @map("teacher_id") @db.Uuid
  deletedAt       DateTime? @map("deleted_at") @db.Timestamp(6)
  
  // Relations
  skill           Skill?    @relation(fields: [skillId], references: [id])
  teacher         User      @relation(fields: [teacherId], references: [id])

  @@map("study_materials")
}

model Notification {
  id               String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  receiverId       String?          @map("receiver_id") @db.Uuid
  notificationType NotificationType @map("notification_type")
  title            String           @db.VarChar(200)
  message          String           @db.Text
  isRead           Boolean          @default(false) @map("is_read")
  
  // Relations
  receiver         User?            @relation(fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([receiverId, isRead], map: "idx_notifications_receiver")
  @@map("notifications")
}

model SystemSetting {
  settingKey   String @id @map("setting_key") @db.VarChar(100)
  settingValue String @map("setting_value") @db.Text

  @@map("system_settings")
}