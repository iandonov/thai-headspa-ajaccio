# Thai Head Spa Ajaccio

Full-stack booking website for a Thai head-spa salon in Ajaccio: public marketing pages, an online booking flow (service → date/slot → details, with inline login/registration), a client account area (view & cancel appointments), and an admin dashboard (services/tarifs, formules, availability, reservations, CMS content).

**Live:** https://thai-headspa-ajaccio.azurewebsites.net

## Tech stack

- **SvelteKit 5** (runes) + **Tailwind CSS 4**
- **better-sqlite3** + **Drizzle ORM** (local SQLite file)
- Auth: **bcryptjs** password hashing + **jose** JWT session cookie
- **`@sveltejs/adapter-node`** (runs as a Node server)

## Local development

```sh
npm install
npm run dev            # http://localhost:5173
```

The SQLite database (`spa.db`) is created and seeded automatically on first request (see `src/lib/server/init.ts`). To create an admin user:

```sh
npx tsx scripts/create-admin.ts                 # defaults: admin@thaiheadspa-ajaccio.fr
npx tsx scripts/create-admin.ts you@mail.fr YourPassword!
```

Other useful commands:

```sh
npm run build          # production build -> ./build (adapter-node)
npm run preview        # preview the production build
npm run check          # svelte-check / type-check
```

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_PATH` | Path to the SQLite file | `spa.db` (cwd) |
| `JWT_SECRET` | Signing secret for session JWTs | dev fallback — **must** be set in prod |
| `PORT` | Port the Node server listens on | `3000` (App Service sets this) |

## Deployment — Azure App Service

Hosted on **Azure App Service** (Linux, Node 22, **B1 Basic** plan, ~$13/mo). This works because App Service runs a real Node process with a **persistent `/home` filesystem**, so `better-sqlite3` and the SQLite file run unchanged (unlike serverless platforms such as Cloudflare Workers, which can't run native SQLite or persist a local file).

### Resources

| | |
|---|---|
| Subscription | `efab821f-1294-49d7-936a-a08350e886f4` (personal) |
| Resource group | `rg-thai-headspa` (France Central) |
| App Service plan | `plan-thai-headspa` — B1 Linux |
| Web app | `thai-headspa-ajaccio` |

App settings: `DATABASE_PATH=/home/data/spa.db`, `JWT_SECRET=<secret>`, `SCM_DO_BUILD_DURING_DEPLOYMENT=true`. Startup command: `node build`. Always On + HTTPS-only enabled.

> **Why `/home/data/spa.db`?** `/home` is the persistent share. `/home/site/wwwroot` is overwritten on every deploy, so the DB lives in `/home/data` instead, which survives redeploys. `src/lib/server/db/index.ts` and `init.ts` both `mkdirSync` the parent dir before opening, so the folder is created automatically on first boot.

### First-time setup (one-off)

```sh
az login                                   # use the account that owns the subscription
az account set --subscription efab821f-1294-49d7-936a-a08350e886f4
az group create -n rg-thai-headspa -l francecentral
az appservice plan create -n plan-thai-headspa -g rg-thai-headspa --is-linux --sku B1 -l francecentral
az webapp create -n thai-headspa-ajaccio -g rg-thai-headspa -p plan-thai-headspa --runtime "NODE:22-lts"
az webapp config appsettings set -n thai-headspa-ajaccio -g rg-thai-headspa --settings DATABASE_PATH=/home/data/spa.db JWT_SECRET=<secret> SCM_DO_BUILD_DURING_DEPLOYMENT=true
az webapp config set -n thai-headspa-ajaccio -g rg-thai-headspa --startup-file "node build" --always-on true
az webapp update -n thai-headspa-ajaccio -g rg-thai-headspa --https-only true
```

### Deploying code

Zip the **source** (not `node_modules` or `build/`) and let Azure's Oryx build it on Linux — this compiles `better-sqlite3` for the correct platform:

```sh
# from the project root, staging package.json, src/, static/, configs (no node_modules / build / *.db)
az webapp deploy -n thai-headspa-ajaccio -g rg-thai-headspa --src-path deploy.zip --type zip --clean true
```

- `--clean true` clears `wwwroot` first; without it, leftover `node_modules` tarballs can cause an rsync rename failure.
- Data in `/home/data/spa.db` is untouched by deploys.

### Migrating the local database to Azure

Upload a clean copy of `spa.db` to the persistent volume via the Kudu VFS API while the app is stopped:

```sh
# 1. make a self-contained copy (folds in WAL): VACUUM INTO 'spa-upload.db'
# 2. az webapp stop ...
# 3. PUT the file to /api/vfs/data/spa.db  (header: If-Match: *)
# 4. az webapp start ...
```

### ⚠️ Gotchas

- **Git Bash mangles POSIX paths.** Setting `DATABASE_PATH=/home/data/spa.db` from a Git-Bash shell on Windows rewrites it to `C:/Program Files/Git/home/data/spa.db`. Set path-valued app settings from **PowerShell**, or prefix the command with `MSYS_NO_PATHCONV=1`.
- **Single instance only.** SQLite on local disk assumes one machine. Do not scale the plan out to multiple instances without switching to a shared database.
- Node 20 is retired on App Service; use **Node 22 LTS**.
