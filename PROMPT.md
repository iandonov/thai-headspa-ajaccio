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
