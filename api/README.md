# Connect 2026 API

API de inscrições, controlo de lotação (`MAX_REGISTRATIONS`), geração de convite com QR Code assinado e envio automático por e-mail para o evento **Connect 2026**.

## Variáveis de Ambiente Principais

Consulte [`.env.example`](.env.example) e [`.env.production.example`](.env.production.example):

- `MAX_REGISTRATIONS`: número máximo de inscritos permitidos (ex.: `200`).
- `FRONTEND_URL`: origens permitidas no CORS (ex.: `https://connect2026.seudominio.com`).
- `TICKET_SECRET`: chave usada para assinar o QR Code de cada convite.
- `ADMIN_API_KEY`: chave usada no header `x-admin-api-key` para validar o check-in em `POST /api/checkin`.
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (ou `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`): envio automático do e-mail com o QR Code embutido.

## Desenvolvimento Local

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm start:dev
```

## Deploy na VPS / Dokploy

Segue o padrão `med-project-api` com `Dockerfile` multi-stage, `docker-entrypoint.sh` e `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

No **Dokploy** (`Source: Docker Raw`), utilize o conteúdo de `docker-compose.prod.yml` e configure as variáveis na aba *Environment*.
