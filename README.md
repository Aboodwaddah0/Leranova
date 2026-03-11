# Learnova Backend

## Project Overview
Learnova Backend is a Node.js and Express API project that uses Prisma ORM with a MariaDB/MySQL database.

Tech stack:
- Node.js + Express
- Prisma ORM
- MariaDB/MySQL

## Project Idea (Quick Summary)
Learnova Backend powers an academy-style learning platform where organizations can register, authenticate, and manage learning operations through API endpoints.

Who it serves:
- Learning organizations and academy admins
- Platform operators managing approvals and user access
- Developers integrating frontend or mobile clients with the API

Main backend capabilities:
- Authentication and organization account workflows
- Domain modules for courses, lessons, users, chats, comments, notifications, and enrollments
- Centralized validation, error handling, and database access through Prisma

## Architecture (High-Level)
The project follows a layered Express architecture to keep responsibilities clear and maintainable:

- `routes/`: Defines API endpoints and maps requests to controllers.
- `controllers/`: Handles HTTP request/response flow and delegates business logic.
- `services/`: Contains core business logic and Prisma operations.
- `middlewares/`: Manages cross-cutting concerns like auth and error handling.
- `utils/`: Shared helpers (token generation, password hashing, API response helpers, Prisma client).
- `prisma/`: Schema and migrations for database structure/versioning.

Practical request flow:
`Route -> Controller -> Service -> Prisma/DB -> Response`

## Prerequisites
Before you start, make sure you have:
- Node.js (LTS recommended)
- npm
- A running MariaDB/MySQL database (local, Docker, or cloud)

## Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/Aboodwaddah0/Leranova.git
cd Leranova
npm install
```

## Environment Variables (.env)
Create your own `.env` file in the project root (same level as `package.json`).

You can copy from this `.env.example` template:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DB_NAME"
PORT=5000
JWT_SECRET=your_strong_secret_here
```

Variable notes:
- `DATABASE_URL`: Prisma connection string to your database.
- `PORT`: Server port.
- `JWT_SECRET`: Secret used to sign and verify JWT tokens.

Security note:
- Never commit or push `.env` to GitHub.
- Never place real secrets in `README.md`.

## Database Setup (Docker Optional)
I personally use Docker for local database setup, but this is optional.

You can use any environment that works for you:
- Docker
- Local MariaDB/MySQL installation
- Cloud database provider

The only requirement is that `DATABASE_URL` in `.env` points to your actual database.

Optional Docker example:

```bash
docker run --name learnova-db -p 3307:3306 -e MYSQL_ROOT_PASSWORD=your_password -d mariadb:latest
```

Then your `DATABASE_URL` might look like:

```env
DATABASE_URL="mysql://root:your_password@127.0.0.1:3307/learnova_db"
```

## Prisma Commands (db push / generate / studio)
After setting `.env`, run Prisma commands:

```bash
npx prisma db push
npx prisma generate
```

Optional database UI:

```bash
npx prisma studio
```

## Run the Server (dev/start)
Development mode (nodemon):

```bash
npm run dev
```

Standard run:

```bash
npm start
```

## API Base URL
Local base URL:

```text
http://localhost:5000
```

Current auth routes are mounted at:

```text
/api/auth/org
```

Example full path:

```text
http://localhost:5000/api/auth/org
```

## Troubleshooting
- `Invalid token` errors:
  - Make sure `JWT_SECRET` is set in `.env`.
  - Restart the server after changing `.env`.

- Database connection errors:
  - Verify your database is running.
  - Confirm `DATABASE_URL` host, port, username, password, and database name.

- Prisma sync issues:
  - Re-run:
    ```bash
    npx prisma db push
    npx prisma generate
    ```

- Environment variables not loading:
  - Ensure `.env` is in the project root.
  - This project loads env vars from `server.js` using `import 'dotenv/config';`.

## Security Notes
- Never commit or push `.env` to GitHub.
- Keep `JWT_SECRET` and database credentials private.
- Use placeholders only in documentation and examples.

