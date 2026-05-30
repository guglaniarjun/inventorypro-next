# Deploying InventoryPro (VPS)

Run these commands on the VPS, inside the app directory (where this repo is checked out):

```bash
git pull origin main
npm install
npx prisma generate
npm run build
pm2 restart inventorypro-next --update-env
pm2 logs inventorypro-next
```

## Notes

- `npx prisma generate` regenerates the Prisma client. Safe to run every deploy.
- `pm2 restart inventorypro-next --update-env` reloads the process **and** picks up any
  changed environment variables. The PM2 process name is `inventorypro-next`.
- `pm2 logs inventorypro-next` tails the logs so you can confirm a clean boot and watch the
  temporary `[debug]` request logs from `/api/inventory/items` and `/api/assets`.

## Only when the database schema changed

If `prisma/schema.prisma` was modified, push the schema **before** building:

```bash
npm run db:push
```

## Verifying a deploy is current (not stale)

After restarting, open `http://<host>:3000/api/debug` while logged in. It reports the live
counts, orphaned-reference counts, and sample rows for your tenant. If the data there does not
match what the pages show, the build is stale — re-run the steps above.
