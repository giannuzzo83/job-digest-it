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

      CREATE TABLE IF NOT EXISTS digest_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_at TEXT NOT NULL DEFAULT (datetime('now')),
        min_score INTEGER NOT NULL,
        total_raw INTEGER NOT NULL,
        total_ranked INTEGER NOT NULL,
        jobs_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_digest_runs_run_at ON digest_runs(run_at DESC);
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

function serializeJobForWeb(job, { inEmail = false, alreadySent = false } = {}) {
  return {
    id: job.id,
    source: job.source,
    title: job.title,
    company: job.company,
    location: job.location,
    url: job.url,
    description: job.description,
    country: job.country ?? null,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    contractType: job.contractType ?? null,
    postedAt: job.postedAt ?? null,
    score: job.score,
    reasons: job.reasons ?? [],
    highlightTags: job.highlightTags ?? [],
    inEmail,
    alreadySent,
  };
}

export function saveDigestRun({ minScore, totalRaw, jobs, selectedIds = [] }) {
  const selectedSet = new Set(selectedIds);
  const payload = jobs.map((job) =>
    serializeJobForWeb(job, {
      inEmail: selectedSet.has(job.id),
      alreadySent: wasAlreadySent(job.id),
    }),
  );

  const result = getDb()
    .prepare(
      `
      INSERT INTO digest_runs (min_score, total_raw, total_ranked, jobs_json)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run(minScore, totalRaw, jobs.length, JSON.stringify(payload));

  purgeOldDigestRuns(30);
  return result.lastInsertRowid;
}

export function getDigestRun(id) {
  const row = getDb()
    .prepare(
      `
      SELECT id, run_at AS runAt, min_score AS minScore, total_raw AS totalRaw,
             total_ranked AS totalRanked, jobs_json AS jobsJson
      FROM digest_runs
      WHERE id = ?
    `,
    )
    .get(id);

  if (!row) return null;
  return {
    id: row.id,
    runAt: row.runAt,
    minScore: row.minScore,
    totalRaw: row.totalRaw,
    totalRanked: row.totalRanked,
    jobs: JSON.parse(row.jobsJson),
  };
}

export function getLatestDigestRun() {
  const row = getDb()
    .prepare(
      `
      SELECT id, run_at AS runAt, min_score AS minScore, total_raw AS totalRaw,
             total_ranked AS totalRanked, jobs_json AS jobsJson
      FROM digest_runs
      ORDER BY run_at DESC, id DESC
      LIMIT 1
    `,
    )
    .get();

  if (!row) return null;
  return {
    id: row.id,
    runAt: row.runAt,
    minScore: row.minScore,
    totalRaw: row.totalRaw,
    totalRanked: row.totalRanked,
    jobs: JSON.parse(row.jobsJson),
  };
}

export function listDigestRuns(limit = 30) {
  return getDb()
    .prepare(
      `
      SELECT id, run_at AS runAt, min_score AS minScore, total_raw AS totalRaw,
             total_ranked AS totalRanked
      FROM digest_runs
      ORDER BY run_at DESC, id DESC
      LIMIT ?
    `,
    )
    .all(limit);
}

export function purgeOldDigestRuns(keep = 30) {
  getDb()
    .prepare(
      `
      DELETE FROM digest_runs
      WHERE id NOT IN (
        SELECT id FROM digest_runs
        ORDER BY run_at DESC, id DESC
        LIMIT ?
      )
    `,
    )
    .run(keep);
}
