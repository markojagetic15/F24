# F24 Software Engineer Home Task

This is a take-home task for Software Engineer position in F24.

It involves building a Dropbox-like application for creating, deleting and navigating folders and files

**Stack:** NestJS 12, Prisma 7, PostgreSQL 16, React 19, TanStack Query, Vite, Docker Compose.

**Instructions how to ge started are down below**

## Run with Docker

You need Docker with Docker Compose. From the project root, run:

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL, applies the migrations, and starts the backend and the frontend. Database credentials come from `.env`.

**ACCESS THE APPLICATION** on `http://localhost:3000` and API on `http://localhost:3001/api`

## Run without Docker

You need Node.js 22 or newer and PostgreSQL 16 running on `localhost:5432`.

**1. Create the database user.** Run this as a PostgreSQL superuser, for example in `psql`. The credentials match `backend/.env.example`:

```sql
CREATE ROLE f24_user LOGIN PASSWORD 'f24_password' CREATEDB;
```

**2. Start the backend in debug mode.** `db:migrate` creates the database and applies the migrations:

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run start:debug
```

The API runs on `http://localhost:3001/api`, and a debugger can attach to the Node inspector on port `9229`.

**3. Start the frontend** in a second terminal. It runs on `http://localhost:5173` and forwards `/api` requests to the backend:

```bash
cd frontend
npm install
npm run dev
```

**Run the tests** from `backend/`:

```bash
npm test            # unit tests, no database needed
npm run test:e2e    # needs PostgreSQL, creates and uses f24_filesystem_test
```

## Structure of codebase  

DDD architecture was used for backend and Feature-Sliced Design for frontend.

```
backend/
  prisma/            schema and migrations
  src/domain/        entities, errors, name validators, pagination, repository interfaces
  src/application/   services with the use cases
  src/infrastructure/  Prisma client and PostgreSQL repositories
  src/presentation/  controllers, DTOs and error filters
  test/              end-to-end tests
frontend/
  src/app/           query client, URL state
  src/pages/         the folder page
  src/widgets/       folder contents: forms and lists together
  src/features/      user actions: create, delete, search
  src/entities/      folder and file: API calls, queries, rows
  src/shared/        HTTP client, reusable UI, helpers
```

## API Documentation

Base URL: `http://localhost:3001/api`. Request and response bodies are JSON.

| Method | Path | Description | Success |
|---|---|---|---|
| `POST` | `/folders` | Create a folder or subfolder | `201` folder |
| `GET` | `/folders` | List the folders in one location | `200` page of folders |
| `GET` | `/folders/:id` | Get one folder | `200` folder |
| `DELETE` | `/folders/:id` | Delete a folder with everything inside it | `204` |
| `POST` | `/files` | Create a file | `201` file |
| `GET` | `/files` | List the files in one location | `200` page of files |
| `GET` | `/files/search` | Find files by exact name | `200` page of files |
| `GET` | `/files/top` | First 10 files that start with a string | `200` array of files |
| `DELETE` | `/files/:id` | Delete a file | `204` |

### Objects

Files and folders have the same shape. `parentId` is `null` at the root:

```json
{
  "id": "019a1ba7-0a64-7a31-9f2e-3c1d5b7e8a10",
  "name": "report.pdf",
  "parentId": null,
  "createdAt": "2026-11-08T10:15:06.123Z"
}
```

A page holds the items and the cursor for the next page. `nextCursor` is `null` on the last page:

```json
{ "items": [], "nextCursor": null }
```

### Creating: `POST /folders` and `POST /files`

| Body field | Required | Description |
|---|---|---|
| `name` | yes | 1-248 characters for a folder, 1-255 for a file |
| `parentId` | no | UUID of the parent folder. Leave out or send `null` for the root |

A name cannot have leading or trailing spaces, slashes, backslashes or control characters, and cannot be `.` or `..`. Names must be unique among the files, or among the folders, in one location. A file and a folder can share a name.

```bash
curl -X POST http://localhost:3001/api/folders \
  -H 'Content-Type: application/json' \
  -d '{"name":"docs"}'
```

### Listing: `GET /folders` and `GET /files`

Returns the direct children of one location, sorted by name.

| Query parameter | Required | Description |
|---|---|---|
| `parentId` | no | UUID of the folder. Leave out for the root |
| `limit` | no | Page size, 1-200. Default 50 |
| `cursor` | no | `nextCursor` from the previous page |

### Exact search: `GET /files/search`

Returns files whose whole name matches, case-sensitive, sorted by id. An empty page means nothing matched.

| Query parameter | Required | Description |
|---|---|---|
| `name` | yes | The exact file name |
| `parentId` | no | UUID of a folder, or `root` for the root only. Leave out to search all files |
| `limit` | no | Page size, 1-200. Default 50 |
| `cursor` | no | `nextCursor` from the previous page |

A folder search covers only that folder, not its subfolders.

```bash
curl 'http://localhost:3001/api/files/search?name=report.pdf&parentId=root'
```

### Search box suggestions: `GET /files/top`

Returns up to 10 files whose name starts with `prefix`, case-sensitive, sorted by name.

| Query parameter | Required | Description |
|---|---|---|
| `prefix` | yes | 1-255 characters, without slashes, backslashes or control characters |
| `parentId` | no | UUID of a folder, or `root` for the root only. Leave out to search all files |

```bash
curl 'http://localhost:3001/api/files/top?prefix=rep'
```

### Errors

| Status | When | `error` |
|---|---|---|
| `400` | Invalid body, query or id, including unknown fields | `Bad Request` |
| `404` | The folder or file does not exist | `EntryNotFoundError` |
| `409` | The name is already used in that location | `EntryNameConflictError` |
| `413` | The request body is too large | not included |
| `503` | The database cannot be reached | `DatabaseUnavailable` |

```json
{
  "statusCode": 409,
  "error": "EntryNameConflictError",
  "message": "A file named 'report.pdf' already exists in this location."
}
```

For a `400` from validation, `message` is an array with one entry per problem.



## Trade-offs

**Offset vs Cursor** - an offset makes the database read and discard every skipped row, and pages shift when rows change. A cursor continues from a position in the index. The cost is that the API cannot jump to an arbitrary page (which we don't need)

**NestJs** - not a trade-off but a bit of an overkill for this kind of project but having scalability in mind, positive trade-off in the end

**DDD for backend** - also, but of an overkill for this kind of project but same a nestJs positive trade-off for the same reason

**Back button vs Breadcrumbs** - Back button is chosen for simplicity but for example Windows uses both for better UX

**A file and a folder can have the same name in one location**  - same as Windows - there can be folder name `test` and in the same place file named `test.txt`

**Search is case-sensitive** - this keeps it simple and index-backed. Case-insensitive search would need a separate index and a decision on Unicode case rules

**Alphabetical sorting** - lists are sorted by name, like the default view in Windows. Names are compared bytewise (`COLLATE "C"`), so a "starts with" search can use the index. The cost is that upper case sorts before lower case (`Zebra` comes before `apple`)

**Folder depth limit** - there is no folder depth limit, user can create as infinite subfolders. In windows there is no limit for depth but there is a limit for path char length 

**Deleting a large folder** - `ON DELETE CASCADE` removes the whole subtree in one transaction, so a delete cannot leave orphans or finish halfway. The cost is that a very large subtree holds its locks for longer and can reach `DB_QUERY_TIMEOUT_MS`. The delete then rolls back and returns `500`. A larger deployment should mark the folder as deleted first and remove its contents in background batches

## Known limitations

- The frontend has no automated tests - only the backend has unit and end-to-end tests
- There is no rate limiting - it should be added for a production environment
- Folder depth is not limited - in windows there is no folder depth limit but there is a limit to path char length
