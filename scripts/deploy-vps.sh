#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$HOME/inventorypro-next"
APP_NAME=inventorypro-next
STATE_DIR="$APP_DIR/.deploy-state"
DEPLOYED_FILE="$STATE_DIR/last-successful-commit"

cd "$APP_DIR"
mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/deploy.lock"
flock -w 900 9

test -f .env || { echo "Missing $APP_DIR/.env" >&2; exit 1; }

current_commit=$(git rev-parse HEAD)
previous_commit=$(cat "$DEPLOYED_FILE" 2>/dev/null || git rev-parse HEAD^ 2>/dev/null || printf '%s' "$current_commit")
schema_changed=false
if ! git diff --quiet "$previous_commit" "$current_commit" -- prisma/schema.prisma; then
  schema_changed=true
  if git diff --quiet "$previous_commit" "$current_commit" -- prisma/migrations; then
    echo 'Prisma schema changed without a committed migration. Deployment stopped before restart.' >&2
    exit 1
  fi
fi

backup_dir="$STATE_DIR/next.previous"
rm -rf "$backup_dir"
if [ -d .next ]; then cp -a .next "$backup_dir"; fi

npm ci --no-audit --no-fund
npx prisma generate
if [ "$schema_changed" = true ]; then npm run db:migrate; fi
npm run build

rollback() {
  echo 'Health check failed; restoring the previous build.' >&2
  if [ -d "$backup_dir" ]; then
    rm -rf .next
    cp -a "$backup_dir" .next
    pm2 restart "$APP_NAME" --update-env || true
  fi
  exit 1
}

pm2 restart "$APP_NAME" --update-env
for _ in 1 2 3 4 5 6; do
  curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/ >/dev/null && break
  sleep 3
done
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3000/ >/dev/null || rollback

printf '%s\n' "$current_commit" > "$DEPLOYED_FILE"
rm -rf "$backup_dir"
pm2 save
echo "Deployed $APP_NAME at $current_commit"
