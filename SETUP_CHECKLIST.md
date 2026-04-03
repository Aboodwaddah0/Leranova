# Setup Checklist - Password Authentication

## Phase 1: Configuration

- [ ] Copy `.env.example` to `.env`
- [ ] Set `DATABASE_URL`
- [ ] Set `JWT_SECRET`
- [ ] Set `NODE_ENV` to `development` or `production`
- [ ] Fill Cloudinary and RAG variables if used in your environment

## Phase 2: Database Setup

- [ ] Start services: `docker compose up -d --build`
- [ ] Verify API health: `http://localhost:5000/health`
- [ ] Verify migrations have run without errors

## Phase 3: Authentication Testing

### Organization Login

```bash
curl -X POST http://localhost:5000/api/auth/organization/login \
  -H "Content-Type: application/json" \
  -d '{
    "Email": "org@example.com",
    "password": "your-password"
  }'
```

### User Login (Teacher/Student)

```bash
curl -X POST http://localhost:5000/api/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "your-password"
  }'
```

Expected result: JWT token is returned directly on success.

## Phase 4: Frontend Integration

- [ ] Use email + password login form for users
- [ ] Remove UI actions for OAuth and one-time login codes
- [ ] Ensure client only calls:
  - `POST /api/auth/organization/login`
  - `POST /api/auth/user/login`

## Phase 5: Production Readiness

- [ ] Backup database before running destructive schema changes
- [ ] Test migrations on staging first
- [ ] Confirm removed endpoints are no longer used by clients
- [ ] Monitor auth errors and failed login attempts

## Removed Endpoints

- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `POST /api/auth/request-login-code`
- `POST /api/auth/verify-login-code`
