# Release Notes

## v1.0.0 — 2026-06-27

First production release of the Thai Head Spa Ajaccio booking site. The notes
below cover the work completed in this session, split between **business /
user-facing changes** and **technical / under-the-hood changes**.

---

### 🌿 Business features

- **Phone number is now mandatory.** Visitors must provide a phone number when
  creating an account and when booking as a guest (anonymous booking). Enforced
  in the form and on the server.

- **Per-day, per-hour availability control (admin).** From the *Disponibilités*
  calendar, clicking a day opens an editor where staff can:
  - close (or reopen) the whole day, or
  - reserve **individual 30-minute slots** so a day stays open while specific
    hours are made unbookable.
  Selections are staged locally and saved together with **“Enregistrer et
  fermer”**; the calendar marks partially-reserved days in a distinct colour.

- **Opening hours extended to 7:30 PM.** Booking slots now run so that
  treatments can finish by 19:30 (previously capped at 18:00 / Sat 17:00).

- **Service options fixed.** On a service, options now start **unselected** and a
  click **adds** one (previously every option was pre-selected and a click
  removed it, so all options leaked into the booking).

- **Same-day booking is now possible.** Today is selectable in the calendar, and
  time slots that have already passed are hidden automatically.

- **“Phone booking only” categories.** Admins can flag a category so its services
  cannot be booked online — the site shows a **“Réserver par téléphone”** call
  CTA instead, and the online reservation flow is blocked for those services.

- **Mobile-friendly admin availability editor.** Larger touch targets, stacked
  action buttons, and a calendar grid that no longer overflows on phones.

---

### ⚙️ Technical changes

- **Schema & migrations** (auto-applied on boot, non-destructive — existing data
  preserved):
  - New `slot_blocks` table (date + start/end) for per-date reserved hours.
  - New `categories.phone_only` flag.
  - All changes guarded with `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE`.

- **Availability engine integration.** Reserved slot blocks are modelled as
  full-capacity intervals so they integrate with the existing bed-capacity logic
  in both the slots API and the booking guard. New batch action `setSlotBlocks`
  replaces a date’s reserved set atomically.

- **Same-day safety.** The slots API filters past start times for the current
  day, and the `book` action rejects past date/time submissions server-side.

- **Booking guards for phone-only categories.** The reservation `load` redirects
  phone-only services back to `/services`, and the `book` action rejects them.

- **Dependency & security maintenance:**
  - `npm audit` → **0 vulnerabilities** (resolved the `cookie` and `esbuild`
    advisories via npm `overrides`).
  - Updated in-range deps: `@sveltejs/kit` 2.68.0, `vite` 8.1.0, `svelte`
    5.56.4, `tailwindcss` 4.3.1, `better-sqlite3` 12.11.1, `@playwright/test`
    1.61.1, `@sveltejs/adapter-node` 5.5.7.
  - Major upgrade: `vitest` 3 → 4.
  - npm 11 install-script approvals recorded for `better-sqlite3` and `esbuild`.

- **Quality.** `svelte-check` clean (0 errors), 41 unit tests passing, and the
  new admin flows verified live on an iPhone-13 viewport via Playwright.

- **Version** bumped `0.0.1` → `1.0.0`.

---

#### Deployment notes

- Deployed to Azure App Service in **fast mode** (local build + prebuilt
  `better-sqlite3` Linux binary). The deploy artifact contains code only — the
  **production database is not touched** and migrates itself on first boot.
- ⚠️ Follow-ups for the operator:
  - Set the real opening hours (incl. trimming Saturday if needed) in
    *Disponibilités*; the seed default is now 09:00–19:30.
  - The footer/contact **hours text** is CMS content (`contact_hours`) — update
    it to match the new hours.
  - **Remove the dev admin login bypass before public launch.**
