# Push sul tuo GitHub

Il codice è pronto in locale. Il bot cloud **non può** scrivere su `giannuzzo83/job-digest-it` (permesso negato).

## Opzione A — 30 secondi (consigliata)

Sul **tuo PC** (PowerShell o Git Bash), con Git già installato:

```bash
git clone https://github.com/giannuzzo83/job-digest-it.git
cd job-digest-it
```

Poi chiedi all’agente Cursor sulla **sessione cloud** di darti un **archivio zip** del progetto, oppure copia la cartella `job-digest-it` dalla VM.

Infine:

```bash
# dalla cartella job-digest-it con tutti i file dentro
git add .
git commit -m "Initial commit: job digest email Italia"
git push -u origin main
```

## Opzione B — Token temporaneo (l’agente fa push per te)

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Repository access: **solo** `job-digest-it`
3. Permissions: **Contents** → Read and write
4. Incolla il token in chat (poi **revocalo** subito dopo il push)

L’agente eseguirà:

```bash
git push https://TUO_TOKEN@github.com/giannuzzo83/job-digest-it.git main
```

## Opzione C — GitHub Desktop

1. File → Add local repository → seleziona cartella `job-digest-it`
2. Publish repository → `giannuzzo83/job-digest-it`

---

Dopo il push: `npm install && npm run setup` (vedi `SETUP-RAPIDO.md`).
