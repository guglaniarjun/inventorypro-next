# InventoryPro School OS

A complete multi-tenant inventory and asset management SaaS for schools, built with:

- **Next.js 14** (App Router)
- **Prisma 5** + **PostgreSQL**
- **Tailwind CSS v3** + shadcn/ui
- **iron-session** for authentication
- **bcryptjs** for password hashing

## Getting Started

```bash
npm install
npx prisma generate
npx prisma db push
npx ts-node --project tsconfig.json prisma/seed.ts
npm run build
npm start
```

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/inventorypro
SESSION_SECRET=your-secret-min-32-chars
```

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Platform Admin | platformadmin | admin123 |
| Tenant Admin | admin | admin123 |
| Physics Lab | physicslab | admin123 |
| Chemistry Lab | chemistrylab | admin123 |
| Kitchen | kitchen | admin123 |
| Auditor | auditor | admin123 |

## Deploy

```bash
npm install && npm run build && pm2 start npm --name inventorypro -- start
```
