# Jagiri's Family App

Family Memory Management Web Application — React + Vite frontend, Node.js + Express backend, PostgreSQL (database: **my-family**).

## Prerequisites

- Node.js 18+
- PostgreSQL (local) with a database named **my-family**
- Existing tables: `family_members`, `events`, `photos` (see plan for column details)

## Database setup

1. Create the database if needed: `createdb -U postgres my-family` (use your PostgreSQL username if different).
2. Create the **users** table (for login/register) by running once from the **project root** (`Jagiris-Family-App`):
   ```bash
   psql -U postgres -d my-family -f backend/database/init-users.sql
   ```
   Replace `postgres` with your PostgreSQL username if you use another. When prompted, enter that user's password.
   Or run the SQL manually:
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id SERIAL PRIMARY KEY,
     username VARCHAR(255) UNIQUE NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     password VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

## Installation

### Backend

```bash
cd backend
npm install
```

Copy environment file and set your values:

```bash
cp .env.example .env
```

Edit `.env` and set at least:

- `JWT_SECRET` — a long random string for signing tokens
- PostgreSQL: `PGUSER`, `PGPASSWORD`, and `PGDATABASE=my-family`  
  Or use a single `DATABASE_URL=postgresql://user:password@localhost:5432/my-family`

### Frontend

```bash
cd frontend
npm install
```

## Running the app

### Backend (API)

From the project root:

```bash
cd backend
npm start
```

Server runs at **http://localhost:5000**. Uploads are served at `http://localhost:5000/uploads`.

### Frontend (dev)

From the project root:

```bash
cd frontend
npm run dev
```

App runs at **http://localhost:5173** and proxies `/api` and `/uploads` to the backend.

## Testing the API

1. **Register**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"test\",\"email\":\"test@example.com\",\"password\":\"secret123\"}"
   ```
   Save the `token` from the response.

2. **Login**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"test\",\"password\":\"secret123\"}"
   ```

3. **Protected route (family members)**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/family-members
   ```

## Project structure

- **backend/** — Express server, routes, controllers, middleware, `database/db.js` and `database/init-users.sql`
- **frontend/** — React + Vite app: `src/pages`, `src/components`, `src/services`, `src/context`
- **README.md** — This file

## Features

- **Auth**: Register, login, JWT-protected routes
- **Family members**: List, add, edit, delete (with optional profile photo)
- **Photo gallery**: List, upload, delete
- **Events**: List (with “upcoming only” filter), add
- **Family tree**: View members grouped by relation
