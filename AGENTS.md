# Job Digest IT — Istruzioni per agenti AI

Digest email giornaliero di offerte di lavoro in Italia, filtrate per profilo tech mid+.
Progetto **indipendente** (nessun legame con altri repo come BangBang).

## Stack e vincoli

- **Runtime:** Node.js 18+ (ES modules, `"type": "module"`)
- **Dipendenze:** `better-sqlite3`, `dotenv`, `nodemailer`, `rss-parser`
- **Linguaggio UI/testi:** italiano (email, log, documentazione utente)
- **Codice:** JavaScript vanilla, nessun bundler né TypeScript
- **Test:** `node --test` (file `*.test.js` accanto al codice)

## Comandi essenziali

```bash
npm install          # o npm ci in CI/cloud
npm test             # unit test scoring/filtri
npm run digest:dry   # anteprima console, nessuna email
npm run digest       # invio email reale (richiede .env)
npm run setup        # wizard interattivo per .env
```

Anteprima HTML su disco: `node src/run-digest.js --save-html` → `data/digest-YYYY-MM-DD.html`

## Architettura

```
src/run-digest.js     → entry point (orchestrazione)
src/config.js         → loadProfile(), initEnv(), paths
src/sources/          → Adzuna API + API remote gratuite + RSS (fetchAllJobs)
src/filters/          → livello mid+, Italia, excludeTerms
src/scoring/          → matchJob (score 0–100, filterAndRankJobs)
src/email/            → buildDigestEmail + SMTP
src/storage/db.js     → SQLite dedup (sent_jobs)
config/profile.json   → profilo utente (skills, query, RSS)
.env                  → segreti (MAI committare)
```

### Flusso digest

1. `fetchAllJobs(profile)` — Adzuna + Jobicy + RemoteOK + Remotive + Arbeitnow + RSS, dedup per `job.id`
2. `filterAndRankJobs` — filtra Italia, score ≥ soglia, ordina per score poi data
3. Esclude annunci già in `sent_jobs` (SQLite)
4. Prende i primi `DIGEST_MAX_JOBS` (default 12)
5. Invia email HTML + marca come inviati, purge record > 60 giorni

### Modello dati annuncio

Ogni job ha almeno: `id`, `source`, `title`, `company`, `location`, `url`, `description`.
Opzionali: `country`, `salaryMin`, `salaryMax`, `contractType`, `postedAt`.
Dopo scoring: `score`, `reasons[]`.

ID formato: `adzuna:<id>`, `jobicy:<id>`, `remoteok:<id>`, `remotive:<id>`, `arbeitnow:<slug>` o hash da URL per RSS.

## Configurazione

| File | Ruolo |
|------|--------|
| `.env` | `DIGEST_TO_EMAIL`, `SMTP_*`, `ADZUNA_*`, opz. `DIGEST_MAX_JOBS`, `DIGEST_MIN_SCORE` |
| `config/profile.json` | `searchQueries`, `skills`, `excludeTerms`, `rssFeeds`, soglie |
| `data/jobs.db` | SQLite locale (gitignored) |

**GitHub Actions** (`.github/workflows/daily-digest.yml`): cron 07:00 UTC; SQLite **non persiste** tra run → possibili duplicati. Per dedup perfetto: cron locale sul PC.

## Convenzioni di codice

- Moduli ES: `import`/`export`, path relativi con `.js`
- `initEnv()` carica `.env` manualmente (non usa `dotenv.config()` nell'entry)
- Log con prefisso `[modulo]` (es. `[digest]`, `[adzuna]`, `[rss]`)
- Normalizzazione testo: lowercase, NFD, strip accenti (vedi `levelFilter.js` / `matchJob.js`)
- Nuove fonti: implementare fetch che ritorna array di job normalizzati, registrarle in `sources/index.js`
- **LinkedIn (opzionale):** tre modalità in `jobApis.linkedin.mode`:
  - `guest` — API pubblica `/jobs-guest/` (senza login, più stabile per listing)
  - `browser` — Playwright con sessione (`npm run linkedin:login`)
  - `hybrid` (default) — guest prima, fallback browser se bloccato
  Disabilitato di default; solo locale, non GitHub Actions
- Non introdurre scraping Indeed (ToS restrittivi); preferire API/feed pubblici

## Cosa NON fare

- Non committare `.env`, `data/`, `*.db`
- Non aggiungere framework pesanti senza richiesta esplicita
- Non modificare `profile.json` con dati personali reali se non richiesto
- Non creare file markdown extra oltre a quelli già nel repo senza richiesta

## Idee di miglioramento (vedi `.cursor/MEMORIA.md`)

Priorità note per sessioni future: nuove fonti RSS/API, persistenza dedup su GitHub Actions, tuning scoring, template email, notifiche alternative (Telegram), dashboard web opzionale.

## Verifica prima di chiudere un task

1. `npm test` passa
2. `npm run digest:dry` non crasha (anche senza chiavi API — Adzuna viene saltata con warning)
3. Diff minimo e focalizzato sulla richiesta
