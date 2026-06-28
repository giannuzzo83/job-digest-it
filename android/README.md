# Job Digest IT — App Android

App nativa **Kotlin + Jetpack Compose** per consultare gli annunci del digest dal telefono, collegandosi al server locale avviato con `npm run web`.

## Requisiti

- Android Studio Ladybug (2024.2) o più recente
- JDK 17
- Telefono e PC sulla **stessa rete Wi‑Fi**

## Build

1. Apri la cartella `android/` in Android Studio
2. Attendi la sync Gradle
3. **Run** su dispositivo/emulatore, oppure **Build → Build APK(s)**

## Configurazione sul PC

```bash
cd job-digest-it
npm install
npm run digest:dry   # crea/aggiorna snapshot in data/jobs.db
npm run web          # server su porta 3847 (tutte le interfacce)
```

Trova l'IP del PC:

- Windows: `ipconfig`
- Linux/Mac: `ip addr` o `ipconfig getifaddr en0`

Esempio URL: `http://192.168.1.42:3847`

### Token (opzionale)

Se in `.env` hai `WEB_TOKEN=...`, inseriscilo nelle impostazioni dell'app.

## Funzionalità app

- Lista annunci con score, fonte, tag ⭐
- Ricerca testuale e filtri (fonte, score minimo, solo email)
- Pull-to-refresh
- Schermata dettaglio con motivazioni match e link all'annuncio
- Tema scuro allineato alla web app

## Note

- L'app **non** raccoglie annunci da sola: legge l'API del server Node sul PC.
- Per uso fuori casa serve esporre il server (VPN, tunnel, o deploy remoto) — non incluso in questa versione.
- HTTP in chiaro è abilitato per la rete locale (`network_security_config.xml`).

## API usate

- `GET /api/digest/latest`
- `GET /api/digest/runs`
- `GET /api/digest/runs/:id`

Autenticazione: header `Authorization: Bearer <token>` o query `?token=`.
