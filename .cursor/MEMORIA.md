# Memoria progetto — Job Digest IT

Documento di contesto persistente per sessioni future. **Aggiornare questo file** quando si prendono decisioni architetturali o si completano milestone rilevanti.

## Stato attuale (v1.1.0)

| Area | Stato |
|------|--------|
| Fonte Adzuna Italia | ✅ Codice pronto — **chiavi mancanti** |
| Fonte Jooble Italia | ✅ Codice pronto — **chiave utente da mettere in `.env`** |
| Fonte Jobicy | ✅ Attiva senza chiavi |
| Fonte RemoteOK | ✅ Attiva senza chiavi |
| Fonte Remotive | ✅ Attiva senza chiavi |
| Fonte Arbeitnow | ✅ Attiva senza chiavi |
| Fonte Himalayas | ✅ Attiva senza chiavi |
| Fonte RemoteJobs.org | ✅ Attiva senza chiavi |
| Fonte RSS | ✅ IProgrammatori + We Work Remotely |
| Fonte LinkedIn | ✅ Opzionale (guest/browser/hybrid) — **disabilitata, setup da PC** |
| Tag AI con ⭐ | ✅ `highlightTags` in profile (copilot, llm, vibe coding, ecc.) |
| Filtri mid+ / Italia / sedi estere | ✅ `levelFilter.js` (fix Germania/München) |
| Scoring profilo | ✅ Soglia default **60%** |
| Email HTML | ✅ Codice pronto — **SMTP mancante** |
| Dedup SQLite | ✅ `storage/db.js`, purge 60 giorni |
| Web app annunci | ✅ `npm run web`, snapshot ad ogni digest |
| GitHub Actions | ✅ Workflow pronto — **secrets non configurati** |
| Test unitari | ✅ 32 test |

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
- [x] Altre API job gratuite (Jobicy, RemoteOK, Remotive, Arbeitnow, Himalayas, RemoteJobs.org, Jooble)
- [ ] Mini dashboard locale (Express + lettura DB)
- [x] Web app annunci navigabile (`npm run web`, snapshot in SQLite)
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

## Checklist setup da PC (quando l'utente dice «sono al PC»)

**Trigger agente:** se l'utente scrive che è al PC, guidarlo passo-passo su questa lista (non rifare codice se non serve).

### 1. Aggiornare il progetto

```bash
git pull origin main
npm install
```

### 2. Configurare `.env` (wizard consigliato)

```bash
npm run setup
```

| Variabile | Obbligatoria | Dove ottenerla |
|-----------|--------------|----------------|
| `DIGEST_TO_EMAIL` | Sì | Email dove ricevere il digest |
| `SMTP_HOST` | Sì | `smtp.gmail.com` |
| `SMTP_PORT` | Sì | `587` |
| `SMTP_SECURE` | Sì | `false` |
| `SMTP_USER` | Sì | Gmail |
| `SMTP_PASS` | Sì | [Password per le app](https://myaccount.google.com/apppasswords) |
| `DIGEST_FROM_EMAIL` | Sì | Come SMTP_USER |
| `DIGEST_FROM_NAME` | Sì | `Job Digest IT` |
| `JOOBLE_API_KEY` | Consigliata | Utente registrato su jooble.org/api/about (500 req) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Opzionale | developer.adzuna.com/signup |

**Jooble:** usare `location=Italy` in `profile.json` (già impostato). Non usare «Milano»/«Roma» come location API (rischia città USA).

**Sicurezza:** la chiave Jooble è stata condivisa in chat — valutare richiesta nuova chiave a Jooble.

### 3. Verificare senza inviare email

```bash
npm test
npm run digest:dry
```

Attesi (circa, senza Adzuna): **~800 annunci grezzi**, **~60 sopra soglia 60%**, **12 in email**. Log `[jooble]` deve mostrare annunci, non «chiave mancante».

### 4. Prima email reale

```bash
npm run digest
```

### 5. (Opzionale) Automazione GitHub Actions

Repo → **Settings → Secrets and variables → Actions** → creare:

`DIGEST_TO_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `DIGEST_FROM_EMAIL`, `DIGEST_FROM_NAME`, `JOOBLE_API_KEY`, `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`

Poi: **Actions → Daily job digest → Run workflow** (branch `main`).

### 6. (Opzionale) Cron locale

```bash
# crontab -e
0 8 * * * cd /percorso/job-digest-it && npm run digest >> /tmp/job-digest.log 2>&1
```

### 7. (Opzionale) LinkedIn

```bash
npx playwright install chromium   # una tantum
npm run linkedin:test           # prova guest senza login
npm run linkedin:login          # solo se serve modalità browser/hybrid
```

Poi in `config/profile.json`: `jobApis.linkedin.enabled = true` (account LinkedIn **secondario**).

### Cosa NON serve fare da PC

- Nessuna modifica codice per Jooble/Himalayas/fonti — già su `main`
- LinkedIn è opzionale e disabilitato di default

## Pendente utente

Stato: **in attesa che l'utente esegua la checklist sopra da PC.** L'utente ha confermato che lo farà più tardi; al messaggio «sono al PC» riprendere da §1.

## Cronologia sessioni

| Data | Nota |
|------|------|
| 2026-06-28 | Filtro sedi estere (fix München); fonte LinkedIn guest/browser/hybrid; 31 test |
| 2026-06-26 | Jooble + Himalayas + RemoteJobs.org su `main`; checklist PC in memoria; merge completo |
| 2026-06-26 | Tag AI ⭐, soglia 60%, keyword vibe/copilot/llm |
| 2026-06-26 | Merge PR #2 fonti gratuite; setup email rimandato a PC |

## Note per l'agente

- Rispondere in **italiano** se l'utente scrive in italiano
- Preferire diff piccoli; riusare pattern esistenti (`normalize`, `buildJobId`, log `[modulo]`)
- Dopo modifiche a scoring/filtri: aggiornare o aggiungere test in `*.test.js`
- Per test end-to-end email serve `.env` reale (non disponibile in cloud senza secrets)
- Se l'utente dice **«sono al PC»**: seguire la sezione «Checklist setup da PC»
