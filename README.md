# F24 Software Engineer Home Task

This is a take-home task for Software Engineer position in F24.

It involves building a Dropbox-like application for creating, deleting and navigating folders and files

**Stack:** NestJS 12, Prisma 7, PostgreSQL 16, React 19, Vite, Docker Compose.

**Instructions how to ge started are down below**

## Run with Docker

You need Docker with Docker Compose. From the project root, run:

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL, applies the migrations, and starts the backend and the frontend. Database credentials come from `.env`.

**ACCESS THE APPLICATION** on `http://localhost:3000` and API on `http://localhost:3001/api`

## Structure of codebase  

DDD architecture was used for backend and basic architecture for frontend.

```
backend/
  prisma/            schema and migrations
  src/domain/        entities, errors, name rules, repository interfaces
  src/application/   services with the use cases
  src/infrastructure/  Prisma client and PostgreSQL repositories
  src/presentation/  controllers, DTOs, validators, error filters, API docs
  test/              end-to-end tests
frontend/
  src/api/           API client
  src/components/    views and forms
  src/hooks/         data loading and URL state
```

## API Documentation

// TODO: Will be made with swagger?
