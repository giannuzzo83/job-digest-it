import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function loadProfile() {
  const profilePath = path.join(rootDir, 'config', 'profile.json');
  return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
}

export function initEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!process.env.DOTENV_LOADED && fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
    process.env.DOTENV_LOADED = '1';
  }
}

export const paths = {
  rootDir,
  dataDir: process.env.JOBS_DATA_DIR ?? path.join(rootDir, 'data'),
  dbPath: process.env.JOBS_DB_PATH ?? path.join(rootDir, 'data', 'jobs.db'),
};
