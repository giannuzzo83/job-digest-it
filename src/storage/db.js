import Database from 'better-sqlite3';
import fs from 'node:fs';
import { paths } from '../config.js';

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(paths.dataDir, { recursive: true });
    db = new Database(paths.dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS sent_jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        company TEXT,
        url TEXT NOT NULL,
        score INTEGER,
        source TEXT,
        sent_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_sent_jobs_sent_at ON sent_jobs(sent_at);
    `);
  }
  return db;
}

export function wasAlreadySent(jobId) {
  const row = getDb().prepare('SELECT 1 FROM sent_jobs WHERE id = ?').get(jobId);
  return Boolean(row);
}

export function markJobsSent(jobs) {
  const insert = getDb().prepare(`
    INSERT OR IGNORE INTO sent_jobs (id, title, company, url, score, source)
    VALUES (@id, @title, @company, @url, @score, @source)
  `);
  const tx = getDb().transaction((items) => {
    for (const job of items) {
      insert.run(job);
    }
  });
  tx(jobs);
}

export function purgeOldSent(days = 60) {
  getDb()
    .prepare(`DELETE FROM sent_jobs WHERE sent_at < datetime('now', ?)`)
    .run(`-${days} days`);
}
