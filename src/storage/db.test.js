import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('digest snapshot: salva, legge ultimo e lista run', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'job-digest-db-'));
  const dbPath = path.join(tmpDir, 'jobs.db');

  process.env.JOBS_DATA_DIR = tmpDir;
  process.env.JOBS_DB_PATH = dbPath;

  const dbModule = await import(`./db.js?test=${Date.now()}`);

  const jobs = [
    {
      id: 'test:1',
      source: 'test',
      title: 'Senior .NET Developer',
      company: 'Acme',
      location: 'Milano, Italia',
      url: 'https://example.com/1',
      description: 'C# .NET backend remoto',
      score: 82,
      reasons: ['Competenza: C#'],
      highlightTags: ['copilot'],
    },
    {
      id: 'test:2',
      source: 'rss',
      title: 'Unity Developer',
      company: 'GameCo',
      location: 'Roma',
      url: 'https://example.com/2',
      description: 'Unity mobile game dev',
      score: 74,
      reasons: ['Competenza: Unity'],
      highlightTags: [],
    },
  ];

  const runId = dbModule.saveDigestRun({
    minScore: 60,
    totalRaw: 120,
    jobs,
    selectedIds: ['test:1'],
  });

  const latest = dbModule.getLatestDigestRun();
  assert.equal(latest.id, runId);
  assert.equal(latest.totalRanked, 2);
  assert.equal(latest.jobs.length, 2);
  assert.equal(latest.jobs[0].inEmail, true);
  assert.equal(latest.jobs[1].inEmail, false);

  const byId = dbModule.getDigestRun(runId);
  assert.equal(byId.jobs[0].title, 'Senior .NET Developer');

  const runs = dbModule.listDigestRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0].totalRaw, 120);

  delete process.env.JOBS_DATA_DIR;
  delete process.env.JOBS_DB_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
