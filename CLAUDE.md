# CLAUDE.md — Learnova Project Context

> **READ FIRST**: This file provides essential context for Claude working on the Learnova project. Always consult this before starting any task.

---

## Project Overview

**Learnova** is a production-grade Learning Management System (LMS) with RAG-powered AI lesson retrieval.

- **Type**: Existing production system (NOT a new build)
- **Architecture**: Clean Architecture (Controller → Service → Repository → Database)
- **Multi-tenant**: Organizations contain courses, subjects, lessons, users

### Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| API          | Node.js (Express 5.x)               |
| ORM          | Prisma 5.x                          |
| Database     | MariaDB 10.6                        |
| RAG Service  | FastAPI (Python 3.11)               |
| Vector DB    | Qdrant 1.x                          |
| File Storage | Cloudinary                          |
| Infra        | Docker Compose                      |

### Service Ports

- API: `5000`
- RAG Service: `8000`
- MariaDB: `3306`
- phpMyAdmin: `8081`
- Qdrant: `6333`

---

## Critical Rules (NEVER VIOLATE)

### Database Stability

This is a PRODUCTION system with active users and data.

**NEVER:**
- Drop/rename existing tables or columns
- Change column types
- Remove foreign keys, unique constraints, or indexes
- Use `prisma db push` (use migrations only)
- Reset database without explicit request
- Modify applied migrations

**ALWAYS:**
- Use `npx prisma migrate dev --name <descriptive_name>` for schema changes
- Make incremental, reversible migrations
- Ensure backward compatibility (APIs must not break)
- Test migrations locally before deploying

### Architecture Rules

- **Controllers**: HTTP handlers, request validation, delegate to services
- **Services**: Business logic, orchestration, return DTOs
- **NEVER**: Controllers calling Prisma directly, services returning raw Prisma models
- **NEVER**: N+1 queries (always use `include` or `select`)

### API Response Format (MANDATORY)

All endpoints MUST return:
```javascript
{
  "success": true,
  "status": 200,
  "data": { /* DTO */ },
  "error": null,
  "timestamp": "2026-04-04T10:00:00Z"
}
```

### Security Rules

- All endpoints (except `/health`, `/`) require JWT token
- Verify organization ownership on every request
- Never return raw Prisma models (always use DTOs)
- Never log passwords, tokens, or sensitive data
- All user inputs validated with Joi

---

## Code Organization

```
src/
├── controllers/     ← HTTP handlers, request validation
├── services/        ← Business logic, orchestration
├── middlewares/     ← Auth, errors, logging
├── routes/          ← Endpoint definitions
├── utils/           ← Helpers (no business logic)
└── validations/     ← Joi schemas
```

### Naming Conventions

- Controllers: `PascalCase` + `Controller` (e.g., `LessonController`)
- Services: `PascalCase` + `Service` (e.g., `LessonService`)
- Routes: kebab-case (e.g., `/api/courses/:courseId/subjects`)
- Database models: snake_case (e.g., `lesson_attachment`)
- DTO properties: camelCase (e.g., `lessonId`, `createdAt`)

---

## Key Entity Relationships

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
```

---

## RAG System Rules

- RAG trigger is ASYNCHRONOUS (never block lesson creation)
- Embeddings in Qdrant are the ONLY source of truth for semantic search
- Max chunk size: 400 words, overlap: 50 words
- AI assistant MUST only synthesize from retrieved chunks (NO hallucinations)
- If no relevant chunks found, respond: "This topic is not covered in the lesson materials."

### RAG Service Integration

- Base URL: `http://rag-service:8000` (Docker) or `http://localhost:8000` (local)
- Trigger: `POST /api/ingest` (async job)
- Retrieval: `POST /api/search` (synchronous)
- Timeout: 10 seconds

---

## Chat System Rules

### Chat Types (Two Only)

1. **GROUP CHAT**: ONE per course (NOT per subject), includes all enrolled students + teachers
2. **PRIVATE CHAT**: Between teacher and student only, created on first message

### Critical Constraints

- `subject_id` MUST be NULL for group chats (course-level only)
- Messages are soft-deleted only (`is_deleted = true`), NEVER hard-deleted
- Pagination MANDATORY: default 20 messages, max 100
- Users can ONLY access chats they are participants in

---

## Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View API logs
docker compose logs -f api

# Apply migrations
docker compose run --rm api npx prisma migrate deploy

# Run Postman tests
npm run test:api

# Run local dev (API only)
npm run dev
```

---

## Definition of Done

A feature/fix is complete ONLY when:

- [ ] Implemented in clean architecture (controller → service → repo)
- [ ] All inputs validated with Joi
- [ ] Responses use DTOs (never raw Prisma models)
- [ ] Postman collection updated with tests
- [ ] Error handling uses custom error classes
- [ ] No N+1 queries introduced
- [ ] Schema changes use Prisma migrations (not `db push`)
- [ ] Auth and org ownership verified
- [ ] Postman tests pass: `npm run test:api`

---

## HTTP Status Codes (STRICT)

| Code | Usage                                      |
|------|--------------------------------------------|
| 200  | GET, successful read/list                  |
| 201  | POST, successful creation                  |
| 204  | DELETE, successful deletion (no body)      |
| 400  | Invalid request (validation error)         |
| 401  | Missing or invalid auth token              |
| 403  | Insufficient permissions                   |
| 404  | Resource not found                         |
| 409  | Conflict (duplicate, state violation)      |
| 500  | Server error                               |

---

## Git Commit Format

```
<type>(<scope>): <subject>
```

Examples:
- `feat(lesson): add RAG ingestion trigger on file upload`
- `fix(auth): prevent cross-org login bypass`
- `refactor(service): split lesson service into smaller modules`
- `test(postman): update collection with new endpoints`

---

## Key Files

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Controllers: `src/controllers/`
- Services: `src/services/`
- Routes: `src/routes/`
- Postman: `postman/Learnova_Backend.postman_collection.json`
- Full governance: `AGENTS.md`

---

## Violations & Escalations

**Stop work immediately if:**
- Cross-organization data access without verification
- Password or token in logs
- Blocking RAG ingestion on lesson creation
- N+1 queries introduced
- Raw Prisma models in API responses

**Fix in current cycle:**
- Missing Postman tests
- Unvalidated user inputs
- Missing error handling

---

**Last Updated**: April 4, 2026
**Owner**: Learnova Development Team
