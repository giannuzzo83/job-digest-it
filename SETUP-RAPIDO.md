# Setup in 5 minuti (solo tu)

L’agente ha già preparato tutto il codice. Restano **3 passi** che richiedono il tuo account (non accessibili dall’agente):

## Passo 1 — Crea repo GitHub (1 min)

1. Apri: https://github.com/new?name=job-digest-it&description=Digest+email+lavoro+Italia
2. Lascia **vuoto** (no README)
3. Clicca **Create repository**
4. Sul tuo PC, nella cartella del progetto:

```bash
cd job-digest-it
git remote add origin https://github.com/giannuzzo83/job-digest-it.git
git push -u origin main
```

> Se cloni da zero: copia la cartella `job-digest-it` dalla VM o chiedi all’agente di esportarla.

## Passo 2 — Chiavi gratuite (3 min)

| Servizio | Link | Cosa copiare |
|----------|------|--------------|
| **Adzuna API** | https://developer.adzuna.com/signup | `APP_ID` + `APP_KEY` |
| **Gmail** | https://myaccount.google.com/apppasswords | Password 16 caratteri |

## Passo 3 — Setup automatico (1 min)

```bash
npm install
npm run setup
```

Lo script chiede email + password + Adzuna, scrive `.env`, fa un test e opzionalmente invia la prima email.

---

## Automazione giornaliera (opzionale)

Repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**

Copia gli stessi valori del file `.env`:

- `DIGEST_TO_EMAIL`
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `SMTP_SECURE` = `false`
- `SMTP_USER`
- `SMTP_PASS`
- `DIGEST_FROM_EMAIL`
- `DIGEST_FROM_NAME` = `Job Digest IT`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`

Il workflow parte ogni mattina alle ~09:00 (ora IT).

**Consiglio:** per evitare annunci ripetuti, usa anche un **cron sul PC** (il DB SQLite su GitHub Actions non persiste).

---

## Comandi utili

```bash
npm run digest:dry              # anteprima in console
npm run digest                  # invia email
node src/run-digest.js --save-html   # salva HTML in data/

# LinkedIn (opzionale, solo sul PC)
npx playwright install chromium # una tantum, dopo npm install
npm run linkedin:test           # prova senza login (modalità guest)
npm run linkedin:login          # login manuale per modalità browser/hybrid
```

---

## LinkedIn (opzionale, da PC)

La fonte è **disabilitata di default**. Per attivarla dopo `git pull`:

1. `npm install && npx playwright install chromium`
2. Prova senza login: `npm run linkedin:test`
3. Se vuoi più risultati italiani, login browser: `npm run linkedin:login`
4. In `config/profile.json` → `jobApis.linkedin.enabled = true`
5. Modalità consigliata: `"mode": "hybrid"` (guest + fallback browser)

| Modalità | Login | Quando usarla |
|----------|-------|---------------|
| `guest` | No | Prima prova, veloce |
| `browser` | Sì | Più annunci con sessione italiana |
| `hybrid` | Opzionale | Default — guest prima, browser se bloccato |

**Attenzione:** usa un account LinkedIn **secondario** (rischio ban ToS). Non usare su GitHub Actions.

