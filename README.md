# Quiz App

A comprehensive educational quiz application built with Next.js and Electron for offline-first student assessment with real-time synchronization.

## ✨ Features

- **Offline Quiz Taking**: Complete quizzes without internet connectivity
- **Admin Dashboard**: User management, analytics, and data export
- **Dual Database**: Local SQLite + Remote PostgreSQL sync
- **CSV Import/Export**: Bulk question import and data export
- **Cross-platform**: Windows 7+ support

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Electron 36, SQLite, PostgreSQL (Neon), Drizzle ORM
- **Tools**: PNPM, ESLint, Electron Builder

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
pnpm db:migrate:neon
pnpm seed:remote

# Start development
pnpm electron:dev
```

## 📦 Building

```bash
# Build for production
pnpm electron:build

# Create distribution packages
pnpm electron:dist:win
```

## 🔧 Environment Variables

| Variable            | Description                  | Required |
| ------------------- | ---------------------------- | -------- |
| `NEON_DATABASE_URL` | PostgreSQL connection string | Yes      |
| `JWT_SECRET`        | JWT signing secret           | Yes      |

## 📁 Key Scripts

- `pnpm electron:dev` - Start development mode
- `pnpm build` - Build Next.js static files
- `pnpm electron:build` - Build everything
- `pnpm electron:dist:win` - Create Windows installer
- `pnpm seed:remote` - Seed database with initial data

## 🏗 Architecture

- **Local SQLite**: Primary offline storage
- **Remote PostgreSQL**: Cloud backup and sync
- **Electron**: Desktop application wrapper
- **Next.js**: Static export for UI

---

**Built for educational excellence**
