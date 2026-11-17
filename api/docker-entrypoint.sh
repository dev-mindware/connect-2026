#!/bin/sh
set -e

# Se DATABASE_URL não foi definida, mas existirem as variáveis do PostgreSQL:
if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-connect2026}?schema=public"
  echo "==> DATABASE_URL derivada automaticamente de POSTGRES_USER, POSTGRES_PASSWORD e POSTGRES_DB."
fi

# Dentro de um container Docker, localhost/127.0.0.1 aponta para o próprio container da API,
# nunca para o serviço Postgres do docker-compose. Ajusta automaticamente quando detectado.
case "$DATABASE_URL" in
  *@localhost:*|*@127.0.0.1:*|*@localhost/*|*@127.0.0.1/*)
    export DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed -E 's/@(localhost|127\.0\.0\.1)(:[0-9]+)?/@postgres:5432/')
    echo "==> DATABASE_URL apontava para localhost/127.0.0.1 dentro do container; ajustada para 'postgres:5432'."
    ;;
esac

echo "==> A verificar migrações da base de dados..."
ok=0
for i in $(seq 1 10); do
  out=$(./node_modules/.bin/prisma migrate deploy 2>&1) && { echo "$out"; ok=1; break; }
  echo "$out"
  echo "$out" | grep -qE 'P1001|P1002|P1017' || { echo "==> Erro de configuração, não de ligação. A abortar."; exit 1; }
  echo "==> Base de dados indisponível. A repetir ($i/10)..."
  sleep 2
done
[ "$ok" = 1 ] || { echo "==> Falha ao ligar à base de dados após 10 tentativas. A abortar."; exit 1; }

echo "==> Migrações aplicadas com sucesso."

echo "==> A iniciar a API na porta ${PORT:-3030}..."
exec node dist/main.js
