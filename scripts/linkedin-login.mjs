#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const sessionPath = process.env.LINKEDIN_SESSION_PATH ?? path.join(dataDir, 'linkedin-session.json');

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('[linkedin:login] Playwright non installato.');
    console.error('Esegui: npm install && npx playwright install chromium');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });

  const browser = await playwright.chromium.launch({
    headless: false,
    slowMo: 60,
  });

  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    locale: 'it-IT',
  });
  const page = await context.newPage();

  console.log('[linkedin:login] Apri LinkedIn e accedi manualmente nel browser.');
  console.log('[linkedin:login] Al termine verrai reindirizzato al feed o alla home.');

  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForURL(/linkedin\.com\/(feed|jobs|mynetwork|in\/)/, { timeout: 300_000 });
  } catch {
    console.error('[linkedin:login] Timeout: login non completato entro 5 minuti.');
    await browser.close();
    process.exit(1);
  }

  await context.storageState({ path: sessionPath });
  await browser.close();

  console.log(`[linkedin:login] Sessione salvata in ${sessionPath}`);
  console.log('[linkedin:login] Abilita la fonte in config/profile.json → jobApis.linkedin.enabled = true');
}

main().catch((err) => {
  console.error('[linkedin:login] Errore:', err.message);
  process.exit(1);
});
