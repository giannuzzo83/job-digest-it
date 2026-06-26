# Memoria progetto — Job Digest IT

Documento di contesto persistente per sessioni future. **Aggiornare questo file** quando si prendono decisioni architetturali o si completano milestone rilevanti.

## Stato attuale (v1.0.0)

| Area | Stato |
|------|--------|
| Fonte Adzuna Italia | ✅ API gratuita, rate limit ~300ms tra query |
| Fonte Jobicy | ✅ API gratuita, geo=italy + industry=dev |
| Fonte RemoteOK | ✅ API gratuita, filtro keyword Italia |
| Fonte Remotive | ✅ API gratuita, categoria software-dev |
| Fonte Arbeitnow | ✅ API gratuita, paginazione + filtro Italia |
| Fonte RSS | ✅ Configurabile in `profile.json`, IProgrammatori di default |
| Filtri mid+ / Italia | ✅ `levelFilter.js` |
| Scoring profilo | ✅ `matchJob.js`, soglia default 60 |
| Email HTML | ✅ `sendDigest.js` via nodemailer |
| Dedup SQLite | ✅ `storage/db.js`, purge 60 giorni |
| GitHub Actions | ✅ Workflow pronto, **secrets non configurati** |
| Setup guidato | ✅ `npm run setup` — **da completare da PC** |
| Test unitari | ✅ scoring + filtri |

## Profilo utente di riferimento

`config/profile.json` è tarato su profilo **C# / .NET / Unity / mobile / game dev**, livello mid+, Italia.
Personalizzabile senza toccare il codice: skills con peso, `searchQueries`, `excludeTerms`, `rssFeeds`.

## Decisioni architetturali

1. **Node puro, no TS** — semplicità, zero build step, adatto a cron/Actions
2. **SQLite locale** — dedup leggero; accettato limite su GitHub Actions
3. **Adzuna come fonte principale** — 250 req/giorno free tier, copertura IT buona
4. **RSS opzionali** — estensibilità senza scraping aggressivo
5. **Scoring euristico** — non ML; trasparente e testabile
6. **Progetto separato** — nessuna dipendenza da BangBang o altri giochi

## Limitazioni note

- **Email non ancora inviata:** né `.env` locale né secrets GitHub configurati (utente farà setup da PC)
- **Adzuna:** senza `ADZUNA_APP_ID`/`KEY` la fonte viene saltata (warning in log)
- **RSS:** qualità variabile; `requireItaly` per feed non geografici
- **Remote:** accettati se nel testo compaiono keyword Italia o città italiane
- **Annunci senza seniority esplicita:** tenuti se non contengono keyword junior/stage

## Backlog miglioramenti (priorità suggerita)

### Alta priorità
- [ ] **Setup invio email da PC** — vedi sezione «Pendente utente» sotto
- [ ] Persistenza dedup su Actions (es. artifact/cache `jobs.db`, o store esterno tipo gist/S3)
- [x] Feed RSS italiani curati (IProgrammatori) + API gratuite (Jobicy, RemoteOK, Remotive, Arbeitnow)
- [ ] Gestione rate limit Adzuna più robusta (backoff, conteggio query)

### Media priorità
- [ ] Flag CLI `--min-score` / `--max-jobs` oltre a env
- [ ] Statistiche post-run (annunci scartati per motivo)
- [ ] Migliorare estrazione company/location da RSS
- [ ] Template email responsive / dark mode
- [ ] Webhook o notifica Telegram oltre email

### Bassa priorità / esplorazione
- [x] Altre API job gratuite (RemoteOK, Arbeitnow, Jobicy, Remotive) con adapter in `sources/`
- [ ] Mini dashboard locale (Express + lettura DB)
- [ ] Export CSV settimanale degli annunci inviati
- [ ] Supporto multi-profilo (più destinatari)

## File chiave per tipo di modifica

| Obiettivo | File |
|-----------|------|
| Nuove keyword / skills | `config/profile.json` |
| Nuova fonte annunci | `src/sources/*.js` + `sources/index.js` |
| Regole junior/Italia | `src/filters/levelFilter.js` |
| Algoritmo match | `src/scoring/matchJob.js` + test |
| Layout email | `src/email/sendDigest.js` |
| Automazione CI | `.github/workflows/daily-digest.yml` |
| Secrets / env | `.env.example`, `scripts/setup.mjs` |

## Pendente utente (da PC)

L'utente completerà da **PC** (non da cellulare):

1. `git pull origin main && npm install`
2. `npm run setup` — crea `.env` (Gmail + password per le app; Adzuna opzionale)
3. `npm run digest` — prima email di prova
4. (Opzionale) Copiare gli stessi valori in **GitHub → Settings → Secrets → Actions** per il cron giornaliero
5. (Opzionale) **Actions → Daily job digest → Run workflow** per test da cloud

Secrets richiesti: `DIGEST_TO_EMAIL`, `SMTP_*`, `DIGEST_FROM_*`; Adzuna opzionale.

## Cronologia sessioni

| Data | Nota |
|------|------|
| 2026-06-26 | Merge PR #2 + tag AI ⭐ su `main`; setup email rimandato a PC dall'utente |
| 2026-06-26 | Tuning filtri remote EU/EMEA, RSS We Work Remotely, fix keyword `eu` |

## Note per l'agente

- Rispondere in **italiano** se l'utente scrive in italiano
- Preferire diff piccoli; riusare pattern esistenti (`normalize`, `buildJobId`, log `[modulo]`)
- Dopo modifiche a scoring/filtri: aggiornare o aggiungere test in `*.test.js`
- Per test end-to-end email serve `.env` reale (non disponibile in cloud senza secrets)
