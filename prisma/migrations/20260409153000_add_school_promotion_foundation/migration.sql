-- AlterTable
ALTER TABLE course
ADD COLUMN GradeLevel INT NULL;

-- AlterTable
ALTER TABLE student
ADD COLUMN DOB DATE NULL,
ADD COLUMN GradeLevel INT NULL,
ADD COLUMN AcademicStatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE organization_school_settings (
  id INT NOT NULL AUTO_INCREMENT,
  OrgId INT NOT NULL,
  schoolYearStartMonth INT NOT NULL DEFAULT 9,
  schoolYearStartDay INT NOT NULL DEFAULT 1,
  promotionMonth INT NOT NULL DEFAULT 9,
  promotionDay INT NOT NULL DEFAULT 1,
  entryGradeMinAge INT NOT NULL DEFAULT 6,
  passThresholdPercentage DECIMAL(5, 2) NOT NULL DEFAULT 50,
  minSubjectPassPercentage DECIMAL(5, 2) NOT NULL DEFAULT 50,
  requireAllSubjectsPass BOOLEAN NOT NULL DEFAULT true,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (id),
  UNIQUE INDEX organization_school_settings_OrgId_key(OrgId),
  CONSTRAINT fk_school_settings_org
    FOREIGN KEY (OrgId) REFERENCES organization(id)
    ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE organization_promotion_run (
  id INT NOT NULL AUTO_INCREMENT,
  OrgId INT NOT NULL,
  schoolYear INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  summary JSON NULL,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (id),
  UNIQUE INDEX uq_org_promotion_run_school_year(OrgId, schoolYear),
  INDEX idx_org_promotion_run_org(OrgId),
  CONSTRAINT fk_promotion_run_org
    FOREIGN KEY (OrgId) REFERENCES organization(id)
    ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE student_promotion_history (
  id INT NOT NULL AUTO_INCREMENT,
  Student_id INT NOT NULL,
  OrgId INT NOT NULL,
  fromGradeLevel INT NULL,
  toGradeLevel INT NULL,
  decision VARCHAR(20) NOT NULL,
  finalPercentage DECIMAL(5, 2) NULL,
  reason VARCHAR(255) NULL,
  schoolYear INT NOT NULL,
  promotedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (id),
  UNIQUE INDEX uq_student_promotion_history_school_year(Student_id, schoolYear),
  INDEX idx_student_promotion_history_org(OrgId),
  INDEX idx_student_promotion_history_student(Student_id),
  INDEX idx_student_promotion_history_school_year(schoolYear),
  CONSTRAINT fk_student_promotion_history_student
    FOREIGN KEY (Student_id) REFERENCES student(Student_id)
    ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX idx_course_grade_level ON course(GradeLevel);

-- CreateIndex
CREATE INDEX idx_student_grade_level ON student(GradeLevel);

-- CreateIndex
CREATE INDEX idx_student_academic_status ON student(AcademicStatus);
