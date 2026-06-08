# Thai Head Spa Ajaccio

Full-stack booking website for a Thai head-spa salon in Ajaccio: public marketing pages, an online booking flow (service → date/slot → details, with inline login/registration), a client account area (view & cancel appointments), and an admin dashboard (à-la-carte prestations & formules, bed capacity, weekly hours + a closures calendar, reservations, CMS content).

Bookings are **bed/capacity aware**: each prestation declares how many beds it occupies, the salon has a configurable total bed count, and a slot stays available only while free beds remain. Specific dates can be closed via a calendar control, and all **French public holidays are seeded as closed by default**.

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

## End-to-end tests (Playwright)

Playwright drives a real browser against the app to cover the major flows: public
pages, the full guest booking flow, the slots API (holidays closed / working days
open), auth (register, login, bad credentials, admin guard), and the admin pages
(prestations vs formules split, adding a prestation with a bed count, bed
capacity, and the closures calendar).

```sh
npx playwright install chromium   # one-off: download the browser
npm run test:e2e                   # run the suite (headless)
npm run test:e2e:ui                # interactive UI mode
npm run test:e2e:report            # open the last HTML report
```

The suite runs its own dev server on port **4173** against an **isolated, auto-seeded
test database** (`e2e/test.db` via `DATABASE_PATH`), so it never touches your dev
`spa.db`. An admin account is created and authenticated once in `tests/auth.setup.ts`;
config lives in `playwright.config.ts`, specs in `tests/`.

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

The deploy is scripted (`scripts/deploy-azure.ps1`) — it stages a clean tree, deploys, and polls the live site until it serves 200:

```sh
npm run deploy-azure         # reliable: ships source, Oryx builds on Azure  (~4 min)
npm run deploy-azure:fast    # fast: builds locally + ships a prebuilt artifact, Oryx off  (~2.5 min steady state)
```

- **Reliable** sets `SCM_DO_BUILD_DURING_DEPLOYMENT=true`; Azure runs `npm install` + `vite build`.
- **Fast** builds locally and ships `build/` + a prod `node_modules` whose only native dep (`better-sqlite3`) carries a **Linux prebuilt** binary fetched via `prebuild-install --platform linux --arch x64 --target 22.x` (verified to be a Linux ELF before upload); Azure just runs `node build`. Falls back to reliable mode automatically if the prebuilt artifact fails its health check.
- Switching modes flips `SCM_DO_BUILD_DURING_DEPLOYMENT`, which costs one extra container restart — so fast mode is fastest when used consistently. On the B1 single instance the container **restart/warmup dominates** wall-clock, which caps how much faster either mode can get.
- The script's `-NodeTarget` major (default `22.x`) must match the App Service runtime so the prebuilt ABI lines up.

The manual equivalent — zip the **source** (not `node_modules` or `build/`) and let Oryx build on Linux:

```sh
# from the project root, staging package.json, src/, static/, configs (no node_modules / build / *.db)
az webapp deploy -n thai-headspa-ajaccio -g rg-thai-headspa --src-path deploy.zip --type zip --clean true --track-status false
```

- `--clean true` clears `wwwroot` first; without it, leftover `node_modules` tarballs can cause an rsync rename failure.
- `--track-status false` avoids a misleading CLI failure (see Gotchas).
- Data in `/home/data/spa.db` is untouched by deploys.

**No compile on Azure (prebuilt native module).** `better-sqlite3` is the only native dependency; on `npm install` its `prebuild-install` step downloads a **prebuilt binary** instead of compiling — provided the build Node matches a published prebuilt. The runtime container is `node:22-lts` (ABI `node-v127`), and a repo-root **`.node-version` = `22`** pins the Oryx *build* Node to 22 so the prebuilt ABI always matches. (Don't pin via `engines.node`: local dev runs Node 25 and `.npmrc` has `engine-strict=true`, which would break local installs.)

### Migrating the local database to Azure

Upload a clean copy of `spa.db` to the persistent volume via the Kudu VFS API while the app is stopped:

```sh
# 1. make a self-contained copy (folds in WAL): VACUUM INTO 'spa-upload.db'
# 2. az webapp stop ...
# 3. PUT the file to /api/vfs/data/spa.db  (header: If-Match: *)
# 4. az webapp start ...
```

### ⚠️ Gotchas

- **`az webapp deploy` can report a false "failed to start".** With `--clean true`, the CLI's 10-minute startup probe sometimes reports *"site failed to start"* (exit 1) even though the build succeeded and the site comes up on Azure's automatic container retry. Deploy with `--track-status false` and verify the live site yourself (`curl /` and `/api/slots?date=<a-holiday>` → `{"closed":true}`), or check Kudu deployment `status: 4` (Success).
- **Git Bash mangles POSIX paths.** Setting `DATABASE_PATH=/home/data/spa.db` from a Git-Bash shell on Windows rewrites it to `C:/Program Files/Git/home/data/spa.db`. Set path-valued app settings from **PowerShell**, or prefix the command with `MSYS_NO_PATHCONV=1`.
- **Single instance only.** SQLite on local disk assumes one machine. Do not scale the plan out to multiple instances without switching to a shared database.
- Node 20 is retired on App Service; use **Node 22 LTS**.
