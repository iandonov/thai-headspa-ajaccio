# Project Prompt

**Created:** 2026-06-07  
**Project:** Thai Head Spa Ajaccio — Full-Stack SvelteKit Website

---

## Original Request

create new github repo in the current folder  
create a website for a headspa and massage studio  
using this website design as a template: https://lotusheadspala.com/ - use the french language option  
for real content use data from this website: https://thaiheadspaajaccio-9ckr328.gamma.site/  
add functionality for booking and personal account  
add CMS functionality for content management  
use latest version of svelte for client and server part  
store data in a local sqlite db  
store and update this prompt in a local md file  
use whatever design skills are needed to make new website look beautiful

---

## Reference Sources

- **Design template:** https://lotusheadspala.com/ (French version)
- **Content source:** https://thaiheadspaajaccio-9ckr328.gamma.site/

---

## Tech Stack

- **Framework:** SvelteKit (Svelte 5, latest)
- **Styling:** Tailwind CSS v4 + custom CSS variables
- **Database:** SQLite via Drizzle ORM + better-sqlite3
- **Auth:** Custom JWT-based auth (bcrypt + jose)
- **CMS:** Custom admin panel at /admin
- **Booking:** Slot-based calendar booking system

---

## Business Content

**Name:** Thai Head Spa & Massage Ajaccio  
**Address:** 05 rue Comte Bacciochi, 20 000 Ajaccio  
**Phone:** 06 07 94 96 63  
**Booking:** Sur rendez-vous (by appointment)

### Services
| Service | Duration | Price |
|---------|----------|-------|
| Head Spa | 1h15 | €65 |
| Réflexologie Pieds & Mains | 30min | €30 |
| Massage Facial (forfait combiné) | 2h | €100 |
| Massage Corps | 30min | €30 |
| Massage Corps | 1h | €50 |
| Massage Corps | 2h | €100 |

---

## Iteration 2 (2026-06-07)

Follow-up requests, building on the original brief:

- Follow the original prompt (lotusheadspala.com template) precisely.
- Add a **background video** on the home hero (calm water ripples) + **fixed/parallax background images** on scrolling sections.
- Make the scrolling content panels **translucent** (frosted-glass look) so the fixed backgrounds show through.
- Add the **selectable "Formules" packages** from the studio's printed menu (screenshot).

### Formules (selectable packages)
Stored as `services` rows with `category = 'formule'` and a new `options` (JSON) column. Selectable on the home `#formules` section (choose an option chip → "Réserver cette formule" deep-links to `/reservation?service=ID&option=...`). The chosen option flows into the booking notes.

| Formule | Duration | Price | Options au choix |
|---------|----------|-------|------------------|
| Évasion Head Spa | 1h15 | €65 | — |
| Massage Personnalisé | 1h | €50 | Thaï-oil, Aromathérapie, Lifting, Gua-Sha, Réflexologie, Acupressure |
| Pause Express Pieds & Mains | 30min | €30 | Réflexologie, Massage Thaï-oil |
| Head Spa — Sérénité Suprême | 2h | €100 | Lifting (anti-âge), Gua-Sha (éclat) |
| Head Spa — Harmonie Corporelle | 2h | €100 | Aromathérapie, Thaï-oil (énergétique) |
| Head Spa — Vitalité Pieds & Mains | 2h | €100 | Réflexologie, Thaï-oil (vitalité) |
| L'Expérience Complète | 3h | €150 | + Visage + Corps / + Visage + Pieds ou Mains |

### Media assets (royalty-free)
- `static/videos/hero.mp4` — water ripples (Mixkit, free license)
- `static/images/{hero-poster,bg-stones,bg-leaves,bg-candles,bg-water,bg-towels}.jpg` — Unsplash

### CSS helpers added (`src/app.css`)
- `.glass-panel`, `.glass-card`, `.glass-dark` — translucent frosted panels
- `.bg-fixed-img` — `background-attachment: fixed` (falls back to scroll on ≤768px)

## Iteration 3 (2026-06-07)

- **Hero background video.** Initially matched lotusheadspala.com's Elementor YouTube clip (`7BGNAGahig8`), then replaced with a user-supplied file (`static/videos/hero.mp4`) served as a self-hosted looping `<video>` (autoplay + muted + loop + playsinline; restarts from the beginning when it ends), with `hero-poster.jpg` as the load fallback.
- **Background images + translucent panels on every public route.** `/services`, `/about`, `/contact`, `/reservation`, `/reservation/confirmation`, `/connexion`, `/inscription`, `/compte` now use a fixed spa background image with a forest overlay, white headings, and `.glass-panel`/`.glass-card`/`.glass-dark` translucent content (matching the home page). `/admin/*` is intentionally left as a clean dashboard.
