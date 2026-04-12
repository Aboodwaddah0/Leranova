# AGENTS.md — Learnova AI Agent Governance

> **CRITICAL**: This file governs all AI agent work on the Learnova project. Read this FIRST before every task.

---

## 1. Agent Bootstrap System (MANDATORY)

Every AI agent working on this project MUST:

### 1.1 Initialize Phase

- [ ] Read `AGENTS.md` (this file) in full
- [ ] Read `SETUP_CHECKLIST.md` for deployment patterns
- [ ] Read `README.md` for tech stack and architecture overview
- [ ] Check `.env` example for required variables
- [ ] Understand the Prisma schema structure in `prisma/schema.prisma`
- [ ] Confirm this is an EXISTING production system (not a new build)

### 1.2 Memory Activation

- [ ] Load project rules from `/memories/repo/` if available
- [ ] Review recent decisions and patterns in session memory
- [ ] Confirm understanding of current architecture constraints

### 1.3 Pre-Task Checklist

- [ ] Verify services are running: `docker compose ps`
- [ ] Confirm API health: `curl http://localhost:5000/health`
- [ ] Check Postman collection is up-to-date in `postman/Learnova_Backend.postman_collection.json`
- [ ] Understand the current database state

---

## 2. Project Identity

**Learnova** is a production-grade Learning Management System with built-in AI-assisted instruction through RAG-powered lesson retrieval.

### 2.1 Core Mission

- Deliver structured course content (Organization → Course → Subject → Lesson)
- Enable teachers and students to collaborate and track progress
- Provide AI-assisted learning via semantic search over lesson materials
- Maintain data integrity and security across multi-tenant organizations

### 2.2 System Scope

NOT in scope:

- Commerce/billing
- Third-party OAuth (removed as of 2026-04-03)
- Social features beyond comments
- Real-time streaming

IN scope:

- User authentication (email + password)
- Course and lesson management
- File attachments (Cloudinary-backed)
- RAG ingestion pipeline (FastAPI + Qdrant)
- Mark tracking
- Chat and real-time messaging
- Postman API coverage with automated tests

---

## 3. North Star

Learnova aspires to be:

1. **Scalable LMS** — Handle thousands of students across multiple organizations
2. **Content-First** — Lessons are the center of learning; all features support lesson delivery
3. **RAG-Powered** — Semantic search over lesson materials provides guided learning
4. **Secure & Transparent** — Clear access control, audit trails, no data leakage
5. **Production-Ready** — Every endpoint tested, monitored, and documented

---

## 4. Architecture Rules

### 4.1 Technology Stack (Immutable)

- **API**: Node.js (Express 5.x)
- **ORM**: Prisma 5.x
- **Database**: MariaDB 10.6
- **RAG Service**: FastAPI (Python 3.11)
- **Vector DB**: Qdrant 1.x
- **File Storage**: Cloudinary (with local fallback for RAG processing)
- **Transport**: Docker Compose for orchestration

### 4.2 Code Organization (Clean Architecture)

```
src/
├── controllers/     ← HTTP handlers, request validation
├── services/        ← Business logic, orchestration
├── middlewares/     ← Auth, errors, logging
├── routes/          ← Endpoint definitions
├── utils/           ← Helpers (no business logic)
└── validations/     ← Joi schemas
```

**Rule**: Controllers delegate to services. Services never expose Prisma calls directly.

### 4.3 Service Layer Contract

Every service MUST:

- Accept DTOs (not raw Prisma models)
- Return DTOs (not raw Prisma models)
- Handle business logic (not data layer details)
- Throw explicit errors with HTTP status hints
- Log significant state changes

Example:

```javascript
// ✓ CORRECT
async createLesson(orgId, courseId, dto) {
  const course = await this.courseService.getCourseById(courseId, orgId);
  if (!course) throw new NotFoundError('Course not found');
  const lesson = await lessonRepository.create(dto);
  await this.ragService.triggerIngestion(lesson.id); // async, no await
  return toDTO(lesson);
}

// ✗ WRONG
async createLesson(orgId, courseId, dto) {
  const lesson = await prisma.lesson.create({ /* raw schema */ });
  return lesson; // returns Prisma model, not DTO
}
```

### 4.4 Prisma Usage Rules

- Always use relations when fetching (use `include`, `select`)
- NEVER rely on sequential queries (prevents N+1)
- Use transactions for multi-step writes
- Index foreign keys automatically (Prisma handles this)
- Keep migrations in sequential order

Bad:

```javascript
const lessons = await prisma.lesson.findMany();
for (const lesson of lessons) {
  const subject = await prisma.subject.findUnique({
    where: { id: lesson.Subject_id },
  });
  // N+1 query
}
```

Good:

```javascript
const lessons = await prisma.lesson.findMany({
  include: { subject: true },
});
```

---

## 5. Data Flow Definition

### 5.1 Lesson Lifecycle

```
1. Teacher uploads lesson file (PDF, DOCX, VIDEO, etc.)
   ↓
2. Cloudinary stores file, returns URL
   ↓
3. lesson_attachment record created
   ↓
4. RAG Service triggered (async, non-blocking)
   ├─ Extract text/audio
   ├─ Transcribe if needed
   ├─ Chunk content
   ├─ Generate embeddings
   ├─ Store in Qdrant
   ├─ Create lesson_rag_asset record
   └─ Update lesson_transcripts if audio
   ↓
5. Student searches or accesses lesson
   ↓
6. RAG retrieval returns chunks with metadata
   ↓
7. AI assistant uses chunks to answer questions
```

### 5.2 Entity Relationships (READ ONLY)

```
organization
├─ course (many)
│  └─ subject (many)
│     └─ lesson (many)
│        ├─ lesson_attachment (many)
│        ├─ lesson_rag_asset (many)
│        ├─ lesson_transcripts (many)
│        └─ comment (many)
│
├─ academy_user (many)
│  └─ enrollment → course
│
├─ user (many)
│  ├─ teacher (1:1)
│  ├─ student (1:1)
│  └─ chat_participant (many)
│
└─ chat (many)
   ├─ chat_participant (many)
   └─ messages (many)

course
└─ enrollment (many)
```

---

## 6. RAG Rules (CRITICAL)

### 6.1 Embeddings as Source of Truth

- Embeddings in Qdrant are the ONLY source of truth for semantic search
- lesson_rag_asset records track processing state, not content
- Chunks MUST include metadata: `lesson_id`, `timestamp`, `chunk_index`

### 6.2 Ingestion Constraints

- RAG trigger is ASYNCHRONOUS (never block lesson creation)
- Max chunk size: 400 words (tunable, see `rag-service/.env`)
- Overlap: 50 words (prevents context loss)
- Supported formats: PDF, DOCX, TXT, transcribed audio/video
- Unsupported formats fail silently (log error, continue)

### 6.3 Metadata Requirements

Every vector chunk in Qdrant MUST include:

```json
{
  "lesson_id": 42,
  "subject_id": 7,
  "course_id": 3,
  "organization_id": 1,
  "source_type": "pdf|video_transcript|docx|text",
  "chunk_index": 0,
  "created_at": "2026-04-04T10:00:00Z",
  "source_file": "materials.pdf"
}
```

### 6.4 No Hallucinated Content

- AI assistant MUST only synthesize from retrieved chunks
- NEVER fabricate answers not in the RAG result
- NEVER claim certainty beyond the source material
- If no relevant chunks found, assistant MUST say "Not found in lesson materials"

### 6.5 RAG Service Integration

- Base URL: `http://rag-service:8000` (Docker) or `http://localhost:8000` (local dev)
- Trigger endpoint: `POST /api/ingest` (async job)
- Retrieval endpoint: `POST /api/search` (synchronous)
- Timeout: 10 seconds (configurable via `RAG_TRIGGER_TIMEOUT_MS`)
- Failures must not crash lesson creation

---

## 7. API Rules

### 7.1 Response Format (MANDATORY)

ALL endpoints MUST return this format:

```javascript
{
  "success": true,           // boolean
  "status": 200,             // HTTP status code
  "data": { /* DTO */ },     // payload or null if no data
  "error": null,             // error object or null
  "timestamp": "2026-04-04T10:00:00Z"
}
```

Error response:

```javascript
{
  "success": false,
  "status": 400,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": { "field": "email" }
  },
  "timestamp": "2026-04-04T10:00:00Z"
}
```

### 7.2 DTOs (Data Transfer Objects)

Never return raw Prisma models. Example:

```javascript
// lesson.dto.js
class LessonDTO {
  constructor(prismaLesson) {
    this.id = prismaLesson.id;
    this.name = prismaLesson.name;
    this.description = prismaLesson.Description;
    this.subjectId = prismaLesson.Subject_id;
    this.createdAt = prismaLesson.createdAt;
    this.attachmentCount = prismaLesson.attachments?.length || 0;
    // Never include internal fields like Subject_id (use subjectId instead)
  }
}
```

### 7.3 Validation (MANDATORY)

- All user inputs MUST be validated with Joi
- Validation happens in middleware or controller
- Invalid requests return 400 with detailed field errors
- Never trust `content-type` header (validate structure)

### 7.4 Pagination (CONDITIONAL)

If returning a list:

- Include `limit`, `offset`, `total` in response
- Default limit: 20
- Max limit: 100
- Return empty array if no results (not 404)

### 7.5 HTTP Status Codes (STRICT)

- 200: GET, successful read/list
- 201: POST, successful creation
- 204: DELETE, successful deletion (no body)
- 400: Invalid request (validation error)
- 401: Missing or invalid auth token
- 403: Insufficient permissions (authorized user, wrong org/role)
- 404: Resource not found
- 409: Conflict (duplicate, state violation)
- 500: Server error (log it immediately)

---

## 8. Postman Enforcement (STRICT)

### 8.1 Every Endpoint Must Be Documented

- Location: `postman/Learnova_Backend.postman_collection.json`
- Include request body, headers, and expected response
- Use environment variables: `{{base_url}}`, `{{token}}`, `{{org_id}}`
- Update collection whenever new endpoint is added

### 8.2 Test Coverage

Every endpoint MUST have:

- Pre-request script (set up data if needed)
- Test script (validate response structure)
- Both happy path and error cases

Example test:

```javascript
pm.test("Response is successful lesson creation", function () {
  pm.response.to.have.status(201);
  pm.expect(pm.response.json()).to.have.property("success", true);
  pm.expect(pm.response.json().data).to.have.property("id");
  pm.environment.set("lesson_id", pm.response.json().data.id);
});
```

### 8.3 Environment Variables

Postman env file: `postman/Learnova_Local.postman_environment.json`

Required variables:

- `base_url`: http://localhost:5000
- `token`: JWT token (set after login)
- `org_id`: organization ID
- `teacher_id`: teacher's academy user ID
- `student_id`: student's academy user ID

### 8.4 Run Tests Locally

```bash
npm run test:api
```

This runs the full collection with automated test assertions.

### 8.5 Sync Process

- After endpoint changes, update Postman collection manually
- OR use sync script: `node postman/sync-collection.js`
- Commit collection changes to git (not gitignored)

---

## 9. Security Rules

### 9.1 Authentication (MANDATORY)

- All endpoints EXCEPT `/health`, `/` require valid JWT token
- Token format: `Authorization: Bearer <jwt>`
- Token generation: POST `/api/auth/organization/login` or `/api/auth/user/login`
- Token expiry: 7 days (configurable via `JWT_EXPIRES_IN`)
- Refresh tokens: NOT implemented (reauth on expiry)

### 9.2 Authorization (MANDATORY)

Every request MUST:

1. Verify organization ownership (compare `orgId` in request with token payload)
2. Verify user role (teacher can only edit own lessons, students can only see enrolled courses)
3. Verify resource belongs to requesting org (lesson must belong to course in same org)

Example:

```javascript
// Middleware: checkOrgOwnership
async (req, res, next) => {
  const token = decodeToken(req);
  const orgId = req.params.orgId || req.body.orgId;
  if (token.orgId !== parseInt(orgId)) {
    throw new ForbiddenError("Cross-org access denied");
  }
  next();
};
```

### 9.3 Data Leakage Prevention

- Never expose internal IDs in responses (use external IDs if needed)
- Never log sensitive data (emails, passwords, tokens)
- Never return full objects when subset is needed
- Never expose org_id unless user is member of that org

### 9.4 File Upload Security

- Validate file type (check MIME type, not just extension)
- Limit file size (e.g., 50MB for PDFs, 500MB for video)
- Scan for malware (integrate with antivirus if possible)
- Use Cloudinary rate limiting
- Reject executable files (.exe, .sh, .bat, etc.)

Rule:

```javascript
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "video/mp4",
  "audio/mpeg",
];

const SAFE_EXTENSIONS = [".pdf", ".docx", ".txt", ".mp4", ".mp3"];
```

### 9.5 Password Policy

- Min 8 characters (enforced in validation)
- Stored as bcrypt hash (never plain text)
- Reset tokens expire in 1 hour
- Rate limit login attempts (5 failed attempts → 15 min lockout)

### 9.6 CORS (CONDITIONAL)

- Configured in `src/app.js`
- Only allow specific origins in production
- Allow credentials (cookies not used, JWT in header)

---

## 10. Performance Rules

### 10.1 No N+1 Queries

FORBIDDEN:

```javascript
const lessons = await prisma.lesson.findMany();
for (const lesson of lessons) {
  const subject = await prisma.subject.findUnique({ ... });
  // N+1: hits DB once per lesson
}
```

REQUIRED:

```javascript
const lessons = await prisma.lesson.findMany({
  include: { subject: true },
  // Batch query: 2 DB calls total
});
```

### 10.2 Pagination (Always)

- List endpoints MUST support pagination
- Return total count for UI pagination UI
- Default 20 items per page
- Max 100 items per page

### 10.3 Database Indexes

Current indexes (from schema):

- course: OrgId
- lesson: SubjectId
- lesson_attachment: lessonId, fileType
- lesson_rag_asset: lessonId, type
- enrollment: userId, courseId
- marks: StudentId, SubjectId

Before adding new frequent queries, consider adding indexes.

### 10.4 Caching (DEFER)

- NOT implemented in this phase
- Consider for: org settings, subject lists, teacher assignments
- Use Redis if scale requires

### 10.5 Database Connection Pooling

- Prisma handles connection pooling automatically
- Pool size: auto-adjusted based on load
- No manual pool management required

---

## 11. Coding Rules

### 11.1 Clean Architecture (MANDATORY)

```
Request
  ↓
Controller (parse, validate, delegate)
  ↓
Service (business logic, orchestration)
  ↓
Repository/Prisma (data access)
  ↓
Database
  ↓
Response (serialize to DTO)
```

### 11.2 Error Handling (STRICT)

Create custom error classes:

```javascript
// errors/index.js
class LearnvaError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class NotFoundError extends LearnvaError {
  constructor(message) {
    super(message, 404, "NOT_FOUND");
  }
}

class ForbiddenError extends LearnvaError {
  constructor(message) {
    super(message, 403, "FORBIDDEN");
  }
}
```

### 11.3 Logging (REQUIRED)

- Log all authentications (success and failure)
- Log all data mutations (create, update, delete)
- Log RAG ingestion triggers and results
- Log API errors with full context
- Never log passwords or tokens

Example:

```javascript
logger.info(`Lesson created: ${lesson.id}`, {
  lessonId: lesson.id,
  subjectId: lesson.Subject_id,
});
logger.warn(`Failed login attempt`, { email, ip, reason: "Invalid password" });
logger.error(`RAG ingestion failed`, { lessonId: 42, error: err.message });
```

### 11.4 Naming Conventions

- Controllers: `PascalCase` + `Controller` suffix (e.g., `LessonController`)
- Services: `PascalCase` + `Service` suffix (e.g., `LessonService`)
- Routes: kebab-case (e.g., `/api/courses/:courseId/subjects`)
- Database models: snake_case (e.g., `lesson_attachment`)
- DTO properties: camelCase (e.g., `lessonId`, `createdAt`)

### 11.5 Comments & Documentation

- Code should be self-documenting (clear names, small functions)
- Add comments for WHY, not WHAT
- Document non-obvious logic (e.g., RAG timeout calculation)
- Keep README updated with architecture decisions

### 11.6 Git Commit Messages

Format: `<type>(<scope>): <subject>`

Examples:

- `feat(lesson): add RAG ingestion trigger on file upload`
- `fix(auth): prevent cross-org login bypass`
- `refactor(service): split lesson service into smaller modules`
- `test(postman): update collection with new endpoints`

---

## 12. AI Behavior Rules

### 12.1 RAG as Assistant, Not Source

- RAG retrieves lesson materials
- AI synthesizes from those materials only
- NEVER make up answers not in chunks
- NEVER exceed confidence of source material

### 12.2 Transparency in Retrieval

When returning AI-assisted learning results:

```javascript
{
  "answer": "...",
  "sources": [
    { "lessonId": 42, "chunking_index": 0, "score": 0.95 },
    { "lessonId": 42, "chunk_index": 1, "score": 0.87 }
  ],
  "confidence": 0.91  // average relevance score
}
```

### 12.3 Handling Unknown Topics

If no relevant chunks found:

```javascript
{
  "answer": "This topic is not covered in the lesson materials.",
  "sources": [],
  "confidence": 0.0
}
```

NEVER respond with an fabricated answer.

### 12.4 Content Safeguards

- Reject if score < 0.7 (low relevance)
- Refuse harmful requests (bypass security, modify grades, etc.)
- Flag instructor if student submits work identical to RAG responses

---

## 13. Definition of Done

A feature or fix is DONE only when ALL criteria are met:

### 13.1 Code

- [ ] Feature implemented in clean architecture (controller → service → repo)
- [ ] No business logic in controllers
- [ ] All user inputs validated with Joi
- [ ] Responses use DTOs, never raw Prisma models
- [ ] Error handling uses custom error classes
- [ ] Logging covers key operations

### 13.2 Database

- [ ] Schema changes applied via Prisma migration
- [ ] Migration applied locally and tested
- [ ] Migration can be rolled back (no destructive SQL without backup)
- [ ] No N+1 queries introduced
- [ ] Indexes added if needed for performance

### 13.3 Testing

- [ ] Happy path tested in Postman
- [ ] Error cases tested (400, 401, 403, 404, 500)
- [ ] Auth tested (requires token, org ownership verified)
- [ ] Pre-request and test scripts added to Postman
- [ ] Manual testing in browser/mobile if UI-facing

### 13.4 RAG Integration (if applicable)

- [ ] Ingestion triggered asynchronously
- [ ] Metadata stored in vectors (lesson_id, org_id, etc.)
- [ ] Lesson creation does NOT block on RAG
- [ ] Retrieval tested with sample queries
- [ ] No hallucinated content in results

### 13.5 Documentation

- [ ] Postman collection updated
- [ ] README updated if new architecture decision
- [ ] Inline comments added for non-obvious logic
- [ ] Commit message follows format in section 11.6

### 13.6 Security

- [ ] Auth token required (if appropriate)
- [ ] Org ownership verified
- [ ] No data leakage in responses
- [ ] File uploads validated (if applicable)
- [ ] No sensitive data in logs

### 13.7 Performance

- [ ] No N+1 queries
- [ ] Pagination implemented for lists (if needed)
- [ ] Response time < 500ms (excluding RAG ingestion)
- [ ] Database queries optimized (use `include`, `select`)

### 13.8 Ready to Merge

- [ ] All checks above passed
- [ ] Code reviewed by team
- [ ] Postman tests pass: `npm run test:api`
- [ ] Services running: `docker compose ps`
- [ ] API health verified: `curl http://localhost:5000/health`

---

## 14. Chat System Rules (CRITICAL)

The chat system is course-based and MUST follow strict design patterns.

### 14.1 Chat Types (Two Only)

**1. GROUP CHAT (Course Level)**

- ONE chat per course (NOT per subject)
- Includes ALL students enrolled in the course + assigned teachers
- Acts as a classroom discussion channel
- MUST enforce uniqueness constraint: one chat per course
- Created automatically when course is created OR lazily on first access
- Messages are visible to all participants

**2. PRIVATE CHAT**

- Between teacher and student only
- Created on first message
- ONE chat per (teacher, student) pair (no duplicates)
- Messages are visible to both participants only

### 14.2 Chat Ownership & Relationships

Every chat MUST belong to:

```
chat
├── organization_id (REQUIRED)
├── course_id (REQUIRED for group chat, NULL for private chat)
├── subject_id (MUST BE NULL - never used)
├── created_by (user_id of creator)
├── type (GROUP | PRIVATE)
├── title (optional, for group chats)
└── created_at
```

RULE: `subject_id` MUST NOT be used for group chats. Group chats are always course-level.

### 14.3 Chat Creation Rules

**GROUP CHAT Creation**

```javascript
// Option 1: Automatic (on course creation)
await courseService.createCourse(dto);
  → automatically create group_chat with:
    - organization_id = course.organization_id
    - course_id = course.id
    - subject_id = NULL
    - type = 'GROUP'

// Option 2: Lazy (on first access/message)
if (!groupChatExists(courseId)) {
  createGroupChat(courseId);
}
```

Constraint: Use UNIQUE(organization_id, course_id) on chats table to prevent duplicates.

**PRIVATE CHAT Creation**

```javascript
// Created only on first message
const chat = await chatService.createOrGetPrivateChat(
  teacherId,
  studentId,
  organizationId,
);

// Constraint: UNIQUE(organization_id, created_by, participant_user_id)
// where participant_user_id is the "other" user
```

### 14.4 Participant Management

**Group Chat Participants**

```
- Add all students in course automatically
- Add all teachers assigned to course
- Sync on enrollment (add student) / unenrollment (remove student)
```

**Private Chat Participants**

```
- Exactly 2 participants: teacher and student
- Both must have chat_participants record
- No more, no fewer
```

### 14.5 Authorization Rules (STRICT)

Users can ONLY access chats they are direct participants in.

**Students Can Access:**

- Group chat of their enrolled courses (read-write messages)
- Private chats they are part of (read-write messages)

**Teachers Can Access:**

- Group chats of their assigned courses (read-write messages)
- Private chats with their students (read-write messages)
- Cannot access private chats between other teachers and students

**Admins Can Access:**

- All chats in their organization (read-only)

IMPLEMENTATION:

```javascript
// Middleware: verifyUserChatAccess
async (req, res, next) => {
  const chatId = req.params.chatId;
  const userId = req.user.id;

  const isParticipant = await prisma.chat_participants.findUnique({
    where: { unique_chat_user: { chat_id: chatId, user_id: userId } },
  });

  if (!isParticipant) throw new ForbiddenError("No access to this chat");
  next();
};
```

### 14.6 Message Rules

**Message Structure**

```
message
├── id (auto)
├── chat_id (REQUIRED, FK)
├── sender_user_id (REQUIRED, FK)
├── message_type (text | image | file | voice) [DEFAULT: text]
├── content (Text or URL depending on type)
├── sent_at (DateTime, auto)
├── edited_at (DateTime, nullable)
├── is_deleted (Boolean, DEFAULT: false)
├── message_attachments[] (for file/image uploads)
└── (timestamps)
```

**Deletion Rule**

- NEVER hard-delete messages
- Only soft-delete (set `is_deleted = true`)
- Admin can retrieve soft-deleted messages
- Users see only `is_deleted = false` messages

**Validation Rules**

- Message content MUST NOT be empty
- Message type MUST be valid enum
- File uploads MUST pass security checks (same as lesson attachments)
- Max message size: 5000 characters

### 14.7 Performance Rules (Pagination MANDATORY)

**Default Pagination**

```javascript
GET /api/chats/:chatId/messages?limit=20&offset=0

Response:
{
  "success": true,
  "status": 200,
  "data": {
    "messages": [ /* 20 most recent */ ],
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Rules**

- Default limit: 20 messages
- Max limit: 100 messages
- Always order by `sent_at DESC` (newest first)
- NEVER load entire chat history
- Use offset-based pagination
- Include `total` count once per request

**Database Query Rules**

- Always include `chat_participants` join to verify access
- Always include `sender` user info (name, avatar)
- NEVER fetch message_attachments unless explicitly requested
- Index on: (chat_id, sent_at)

### 14.8 API Endpoints (Mandatory Coverage in Postman)

```
GET    /api/chats              - List user's chats
GET    /api/chats/:chatId      - Get chat details
POST   /api/chats              - Create private chat or get group chat
GET    /api/chats/:chatId/messages  - Get paginated messages
POST   /api/chats/:chatId/messages  - Send message
PATCH  /api/chats/:chatId/messages/:msgId - Edit message
DELETE /api/chats/:chatId/messages/:msgId - Soft-delete message
```

Each endpoint MUST be in Postman collection with:

- Request body/params
- Pre-request script (auth, setup)
- Test assertions
- Both success and error cases

### 14.9 Error Handling

Required error cases:

```javascript
// 403: Not a participant of chat
throw new ForbiddenError("You do not have access to this chat");

// 404: Chat does not exist
throw new NotFoundError("Chat not found");

// 400: Invalid message type
throw new ValidationError("Invalid message type");

// 409: Duplicate private chat (if auto-creating)
throw new ConflictError("Private chat already exists with this user");

// 413: Message too large
throw new ValidationError("Message exceeds maximum size");
```

---

## 15. Database Stability Rules (CRITICAL 🔥)

This project is an EXISTING production system with active users and data.

### 15.1 ABSOLUTE RULE

Agents MUST NOT break the database under ANY condition.

Violation of any rule in this section is a CRITICAL failure.

### 15.2 Forbidden Actions (NEVER)

Agents MUST NEVER perform:

- Drop any existing table
- Rename any existing table
- Rename any existing column
- Change column types (INT, STRING, etc.)
- Remove or alter foreign key relationships
- Remove or modify unique constraints
- Remove or modify indexes (unless explicitly replacing)
- Use `prisma db push` in any workflow (use migrations only)
- Reset database without explicit user request
- Run destructive SQL directly on production database
- Modify existing migrations after they are applied

### 15.3 Migration Workflow (MANDATORY)

For ANY schema change:

```bash
# Step 1: Create migration
npx prisma migrate dev --name <descriptive_name>

# Step 2: Test locally
docker compose up -d db
npx prisma migrate deploy  # or docker compose run --rm api npx prisma migrate deploy

# Step 3: Verify existing data
docker compose logs api   # check for errors
curl http://localhost:5000/health  # verify API health

# Step 4: Test affected endpoints
npm run test:api  # run Postman collection
```

**RULE**: Every migration MUST:

- Have a clear, descriptive name: `add_column_name`, `create_table_xyz`, `add_index_abc`
- Be incremental (do one logical thing)
- Be reversible (can roll back without data loss)
- Include data migration if renaming columns

**FORBIDDEN**: Modifying or deleting migrations after `migrate deploy`.

### 15.4 Backward Compatibility (NO BREAKING CHANGES)

All changes MUST be backward compatible:

**Existing APIs MUST NOT break:**

```javascript
// ✗ WRONG: Changes response format
// Old API response
{ "data": { "lessonId": 42 } }

// New API response (BREAKS existing clients)
{ "data": { "id": 42 } }

// ✓ CORRECT: Extend response
{ "data": { "lessonId": 42, "id": 42 } }  // both available
// Later deprecate and remove old field
```

**Existing Data MUST remain valid:**

```javascript
// ✗ WRONG: Rename column without data migration
// Existing code: lesson.Subject_id
// New code: lesson.subjectId
// OLD DATA IS BROKEN

// ✓ CORRECT: Add new column, backfill, then deprecate old
schema.prisma:
  lesson {
    Subject_id Int?  @deprecated(reason: "use subjectId")
    subjectId Int?
  }

migration.sql:
  UPDATE lesson SET subjectId = Subject_id WHERE Subject_id IS NOT NULL;

// Later: remove Subject_id column in separate migration
```

### 15.5 Safe Changes Only

These changes are ALLOWED:

**Add new tables**

```javascript
model new_feature {
  id Int @id @default(autoincrement())
  // ...
}
```

**Add new columns (with defaults)**

```javascript
model lesson {
  // ...
  newField String? @default("default_value")  // NULL is also safe
}
```

**Add new relations**

```javascript
model lesson {
  // ...
  newRelation relation_type @relation(fields: [...])
}

// RULE: Do NOT remove or change existing relations
```

**Add indexes**

```javascript
model lesson {
  // ...
  @@index([newField], map: "idx_lesson_newfield")
}
```

### 15.6 Destructive Changes Detection

If an agent detects a potentially destructive change:

1. **STOP immediately** ⛔
2. **Explain the impact** clearly
3. **Request explicit approval** from user
4. **Do NOT proceed** without confirmation

Example workflow:

```
Agent: "This change requires renaming Subject_id → subjectId.
This impacts:
- lesson service
- all existing APIs returning lesson data
- any code using lesson.Subject_id
- 50 stored lessons in database

Approval required: [YES/NO]"
```

### 15.7 Data Protection Rule

Every database operation MUST consider data safety.

**BEFORE any migration:**

```javascript
// Check 1: Identify affected records
SELECT COUNT(*) FROM lesson WHERE Subject_id IS NULL;

// Check 2: Verify migration logic
// Does it handle NULL values?
// Does it handle edge cases?

// Check 3: Test rollback
// Can this migration be safely undone?
// Are backups available?
```

**AFTER any migration:**

```javascript
// Verify: Existing data is intact
SELECT COUNT(*) FROM lesson;

// Verify: New column is correct
SELECT id, newField FROM lesson LIMIT 10;

// Verify: APIs still work
curl http://localhost:5000/api/lessons
```

### 15.8 Architecture Protection Rule

Agents MUST NOT break Clean Architecture principles:

**FORBIDDEN:**

```javascript
// ✗ Controller calls Prisma directly
const lesson = await prisma.lesson.findUnique({...});
res.json(lesson);

// ✗ Service returns raw Prisma model
class LessonService {
  async getLesson() {
    return prisma.lesson.findUnique({...});  // WRONG
  }
}

// ✗ Mixing business logic in controller
const lesson = await prisma.lesson.create({...});
// ... business logic here ...
res.json(lesson);

// ✗ Service calls another service's private methods
this.privateHelperService.internalMethod();
```

**REQUIRED:**

```javascript
// ✓ Controller validates + delegates
const lesson = await lessonService.getLessonById(id);
res.json(lessonDTO.toJSON(lesson));

// ✓ Service returns DTO
class LessonService {
  async getLesson(id) {
    const lesson = await this.lessonRepository.findById(id);
    return toDTO(lesson);
  }
}

// ✓ Business logic in service
class LessonService {
  async createLesson(dto) {
    // Validate business rules
    // Call repository
    // Return DTO
  }
}
```

### 15.9 Enforcement & Consequences

If any database rule is violated:

| Violation                | Action                                             |
| ------------------------ | -------------------------------------------------- |
| Drop/rename table        | ❌ REJECT immediately, request revert              |
| Change column type       | ❌ REJECT immediately, request migration           |
| Modify applied migration | ❌ REJECT immediately, request new migration       |
| Break API contract       | ❌ REJECT, request deprecation cycle               |
| Break architecture       | ❌ REJECT, request refactor                        |
| N+1 queries              | ⚠️ FLAG as performance issue, request optimization |
| Missing index            | ⚠️ FLAG, consider adding if frequent access        |

Implementation is INVALID if violation detected during code review.

### 15.10 Schema Review Checklist

Before approving ANY schema change, verify:

- [ ] Migration is incremental (one logical thing)
- [ ] No existing tables dropped/renamed
- [ ] No existing columns removed
- [ ] No column types changed
- [ ] All data migrations included in migration
- [ ] Backward compatible (APIs don't break)
- [ ] Existing data remains valid
- [ ] Migration tested locally
- [ ] Postman tests pass after migration
- [ ] Clean Architecture preserved
- [ ] Indexes added for new foreign keys
- [ ] No N+1 queries introduced

---

## 16. Quick Reference

### Service Ports

- API: 5000
- RAG Service: 8000
- MariaDB: 3306
- phpMyAdmin: 8081
- Qdrant: 6333

### Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View API logs
docker compose logs -f api

# Apply migrations
docker compose run --rm api npx prisma migrate deploy

# Reset database (DESTRUCTIVE)
docker compose run --rm api npx prisma migrate reset --force

# Run Postman tests
npm run test:api

# Run local dev (API only, needs external DB)
npm run dev
```

### Environment Variables

See `SETUP_CHECKLIST.md` and `.env` example.

### Key Files

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Controllers: `src/controllers/`
- Services: `src/services/`
- Routes: `src/routes/`
- Postman: `postman/Learnova_Backend.postman_collection.json`

---

## 17. Violations & Escalations

### Critical Violations (Stop work immediately)

- Cross-organization data access without verification
- Password or token in logs
- Blocking RAG ingestion on lesson creation
- N+1 queries introduced
- Raw Prisma models in API responses

### High Priority (Fix in current cycle)

- Missing Postman tests
- Unvalidated user inputs
- Missing error handling
- Insufficient logging

### Low Priority (Fix in next cycle)

- Code style inconsistencies
- Outdated comments
- Missing inline documentation

---

**Last Updated**: April 4, 2026

**Owner**: Learnova Development Team

**Questions/Updates**: Review with team leads before modifying this file.
