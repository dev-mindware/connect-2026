# Connect 2026

Página de inscrição e API de convites digitais com QR Code para o evento **Connect 2026 — O Peso dos Sonhos, O Ritmo da Rotina** (06 de Dezembro · 13h · Shopping Viana).

## Estrutura do Monorepo

- [`frontend/`](frontend): Aplicação React + TypeScript + Vite + Tailwind CSS + shadcn/ui.
- [`api/`](api): API REST Node.js + TypeScript + Prisma + PostgreSQL, preparada para deploy via Docker Compose / Dokploy (padrão `med-project-api`).

## Desenvolvimento Local

### 1. API e Base de Dados

```bash
cd api
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm start:dev
```

### 2. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

## Verificação

```bash
pnpm verify:api
pnpm verify:frontend
```
