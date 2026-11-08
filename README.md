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

## Trade-offs

**Offset vs Cursor** - an offset makes the database read and discard every skipped row, and pages shift when rows change. A cursor continues from a position in the index. The cost is that the API cannot jump to an arbitrary page (which we don't need)

**NestJs** - not a trade-off but a bit of an overkill for this kind of project but having scalability in mind, positive trade-off in the end

**DDD for backend** - also, but of an overkill for this kind of project but same a nestJs positive trade-off for the same reason

**Back button vs Breadcrumbs** - Back button is chosen for simplicity but for example Windows uses both for better UX

**A file and a folder can have the same name in one location**  - same as Windows - there can be folder name `test` and in the same place file named `test.txt`

**Search is case-sensitive** - this keeps it simple and index-backed. Case-insensitive search would need a separate index and a decision on Unicode case rules

## Known limitations

- After creating or deleting an entry, lists return to the first page.
- There is no rate limiting - it should be added for a production environment
- Folder depth is not limited - in windows there is no folder depth limit but there is a limit to path char length
