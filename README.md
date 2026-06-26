# Job Digest IT

Digest **giornaliero via email** con offerte di lavoro in **Italia**, livello **mid+**, filtrate sul tuo profilo tecnico (C#, Unity, mobile, software engineer, ecc.).

Progetto **separato da BangBang** — nessun legame con il gioco.

## Cosa fa

1. Cerca annunci su fonti **gratuite** (Adzuna Italia + feed RSS configurabili)
2. Filtra: solo Italia, esclude junior/stage/tirocini, esclude ruoli fuori profilo
3. Assegna un **punteggio di match** (0–100) in base alle competenze in `config/profile.json`
4. Ti manda **1 email al giorno** con i migliori link (max 12, niente duplicati)

## Requisiti

- [Node.js](https://nodejs.org/) 18+
- Account email con SMTP (es. Gmail + [Password per le app](https://myaccount.google.com/apppasswords))
- Chiavi API **gratuite** Adzuna: [developer.adzuna.com/signup](https://developer.adzuna.com/signup)

## Setup rapido

```bash
git clone <url-del-tuo-repo> job-digest-it
cd job-digest-it
npm install
cp .env.example .env
# Modifica .env con email e chiavi Adzuna
```

### Configura `.env`

| Variabile | Descrizione |
|-----------|-------------|
| `DIGEST_TO_EMAIL` | La tua email dove ricevere il digest |
| `SMTP_*` | Credenziali SMTP (Gmail consigliato) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | API gratuita Adzuna |

### Personalizza il profilo

Modifica `config/profile.json`:

- `searchQueries` — parole chiave usate su Adzuna
- `skills` — competenze con peso per lo scoring
- `excludeTerms` — annunci da scartare
- `rssFeeds` — feed RSS aggiuntivi (opzionale)

## Comandi

```bash
# Anteprima in console (non invia email)
npm run digest:dry

# Invia digest reale
npm run digest

# Test unitari scoring/filtri
npm test
```

## Automazione gratuita (GitHub Actions)

Il workflow `.github/workflows/daily-digest.yml` esegue il digest ogni giorno alle **09:00** (ora italiana, circa).

Aggiungi questi **Secrets** nel repo GitHub → Settings → Secrets:

| Secret | Valore |
|--------|--------|
| `DIGEST_TO_EMAIL` | tua email |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | tua email Gmail |
| `SMTP_PASS` | password per le app |
| `DIGEST_FROM_EMAIL` | come SMTP_USER |
| `DIGEST_FROM_NAME` | `Job Digest IT` |
| `ADZUNA_APP_ID` | da Adzuna |
| `ADZUNA_APP_KEY` | da Adzuna |

Opzionale in **Variables**: `DIGEST_MAX_JOBS`, `DIGEST_MIN_SCORE`.

> **Nota:** su GitHub Actions il database SQLite non persiste tra run — potresti ricevere qualche annuncio ripetuto. Per dedup perfetto, esegui il digest su un PC/server con cron locale.

### Cron locale (alternativa)

```bash
# crontab -e
0 8 * * * cd /percorso/job-digest-it && /usr/bin/npm run digest >> /tmp/job-digest.log 2>&1
```

## Fonti dati (gratis)

| Fonte | Copertura | Note |
|-------|-----------|------|
| **Adzuna Italia** | Ampia, aggregatore IT | API free 250 req/giorno — principale |
| **RSS remoti** | Parziale | Filtrati per keyword Italia; bonus se cerchi remote |

Non usiamo LinkedIn/Indeed scraping (ToS restrittivi). Puoi aggiungere feed RSS italiani in `profile.json` se ne trovi di pubblici.

## Architettura

```
src/
├── run-digest.js      # entry point
├── sources/           # Adzuna + RSS
├── scoring/           # match profilo
├── filters/           # mid+, Italia
├── email/             # HTML + invio SMTP
└── storage/           # SQLite dedup
```

## Licenza

MIT
