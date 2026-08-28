# PostgreSQL Migration Guide

> ⚠️ **This document describes a one-time historical cutover (SQLite →
> PostgreSQL), not ongoing schema management.** The `npx prisma db push`
> advice in Step 4 was correct for that one-time initialization, but
> `db push --accept-data-loss` is **not** how schema changes should be
> deployed today — see `PRODUCTION_MAINTENANCE_GUIDE.md` § 2 for why the
> current production setup is a known, unresolved risk, and read
> `DEPLOYMENT.md` for the correct ongoing approach
> (`npx prisma migrate deploy` with committed migration files).

To ensure high performance and data persistence (especially on platforms like Render where disks are ephemeral), we recommend migrating from SQLite to PostgreSQL.

## 1. Setup PostgreSQL
Provision a PostgreSQL database (e.g., via Render, Supabase, or AWS RDS).

## 2. Update Environment Configuration
In your `server/.env` file, comment out the SQLite URL and add your PostgreSQL connection string:

```env
# DATABASE_URL="file:./prisma/dev.db"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/nexus_hrm?schema=public"
```

## 3. Update Prisma Schema
Modify `server/prisma/schema.prisma` to use the `postgresql` provider:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 4. Run Migration
Use Prisma to push the schema to your new database:

```bash
cd server
npx prisma db push
```

> [!NOTE]
> Since SQLite and PostgreSQL have slightly different typing for certain fields (like Enums vs Strings), `npx prisma db push` is the safest way to initialize the production schema.

## 5. Data Migration (Optional)
If you need to migrate existing data from `dev.db`, you can use tools like:
- `pgloader`: Highly recommended for SQLite to PostgreSQL migrations.
- Custom scripts: Fetch from SQLite and batch insert into PostgreSQL using Prisma.

## 6. Deployment
Ensure the `DATABASE_URL` environment variable is set on your production server (e.g., Render Dashboard).
