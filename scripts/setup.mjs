#!/usr/bin/env node
/**
 * Setup guidato — chiede solo ciò che solo tu puoi fornire (email, SMTP, Adzuna).
 * Uso: npm run setup
 */
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env');
const examplePath = path.join(rootDir, '.env.example');

const rl = readline.createInterface({ input, output });

async function ask(question, defaultValue = '') {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || defaultValue;
}

function run(cmd, args, cwd = rootDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function main() {
  console.log('\n=== Job Digest IT — Setup ===\n');
  console.log('Servono 3 cose che solo tu puoi creare (5 minuti totali):');
  console.log('  1. Email dove ricevere il digest');
  console.log('  2. Password per le app Gmail → https://myaccount.google.com/apppasswords');
  console.log('  3. API Adzuna gratis → https://developer.adzuna.com/signup');
  console.log('  4. (Opz.) API Jooble gratis → https://jooble.org/api/about\n');

  const toEmail = await ask('Email destinatario (DIGEST_TO_EMAIL)');
  const smtpUser = await ask('Email Gmail per invio (SMTP_USER)', toEmail);
  const smtpPass = await ask('Password per le app Gmail (SMTP_PASS)');
  const adzunaId = await ask('Adzuna APP_ID (invio per saltare)');
  const adzunaKey = await ask('Adzuna APP_KEY (invio per saltare)');
  const joobleKey = await ask('Jooble API key (invio per saltare)');

  const env = fs.readFileSync(examplePath, 'utf8')
    .replace('tuo@email.com', toEmail)
    .replace('tuo@gmail.com', smtpUser)
    .replace('xxxx xxxx xxxx xxxx', smtpPass)
    .replace('ADZUNA_APP_ID=', `ADZUNA_APP_ID=${adzunaId}`)
    .replace('ADZUNA_APP_KEY=', `ADZUNA_APP_KEY=${adzunaKey}`)
    .replace('JOOBLE_API_KEY=', `JOOBLE_API_KEY=${joobleKey}`);

  fs.writeFileSync(envPath, env, { mode: 0o600 });
  console.log(`\n✓ Scritto ${envPath}\n`);

  console.log('Test connessione (anteprima, senza invio email)...');
  await run('npm', ['run', 'digest:dry']);

  const sendNow = await ask('\nInviare email di prova adesso? (s/n)', 's');
  if (sendNow.toLowerCase() !== 'n') {
    await run('npm', ['run', 'digest']);
    console.log('\n✓ Email di prova inviata.');
  }

  console.log('\n--- GitHub (automazione giornaliera) ---');
  console.log('Crea repo vuoto: https://github.com/new?name=job-digest-it');
  console.log('Poi esegui:\n');
  console.log(`  cd ${rootDir}`);
  console.log('  git remote add origin https://github.com/TUO_USER/job-digest-it.git');
  console.log('  git push -u origin main\n');
  console.log('Aggiungi gli stessi valori come Secrets in Settings → Secrets → Actions.');
  console.log('Vedi README.md sezione "Automazione gratuita".\n');

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
