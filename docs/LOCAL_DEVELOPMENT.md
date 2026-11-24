# Isolated Local Development Database Guide

To protect the live **production Neon PostgreSQL** database (`ep-noisy-term-ao1xnbgd`), all local manual development uses an **isolated local PostgreSQL 18 cluster** on `127.0.0.1:54322` (`docavail_local`) instead of Neon.

## How Environment Isolation Works

- **`.env.local` (gitignored):** Overrides `DATABASE_URL` and `DIRECT_URL` with the local PostgreSQL 18 connection (`127.0.0.1:54322/docavail_local`). Next.js (`npm run dev` and `npm start`) loads `.env.local` **before** `.env`, so local browser testing cannot write to production Neon.
- **`.env` (gitignored):** Preserved for explicit production maintenance and deployment checks only (never run `npm run db:push` or `db:seed` against `.env`).

> **Important Prisma CLI Note:** Prisma CLI commands (`npx prisma ...`) read `.env` and ignore `.env.local` by default. Always use the `npm run db:local:*` scripts below for local database operations, and only run `npx prisma migrate deploy` when explicitly approved for production rollout.

## Commands

Start (and initialize on first run) the isolated local PostgreSQL 18 database:

```bash
npm run db:local:up
```

Check local database status and row counts:

```bash
npm run db:local:status
```

Run the Next.js development server against the local database:

```bash
npm run dev:local
```

Stop the local PostgreSQL 18 server cleanly:

```bash
npm run db:local:stop
```

## Pre-Seeded Local Test Accounts

All seeded demo accounts on the local database use password `password123`:
- **Admin:** `admin@docavail.com`
- **Demo Patients:** `aanya.sharma@example.com`, `rohan.mehta@example.com`, `priya.verma@example.com`, `arjun.kapoor@example.com`, `meera.singh@example.com`
- **Demo Approved Doctors:** `dr.ananya.rao@docavail.com`, `dr.rahul.khanna@docavail.com`, `dr.neha.kapoor@docavail.com`, `dr.arjun.malhotra@docavail.com`, `dr.kavita.sharma@docavail.com`
