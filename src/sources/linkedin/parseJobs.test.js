import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dedupeRawJobs,
  extractJobIdFromUrl,
  normalizeLinkedInJob,
  parseJobsFromFixtureHtml,
} from './parseJobs.js';
import { buildLinkedInSearchUrl, resolvePostedWithin } from './urls.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'search-results.html'), 'utf8');

describe('sources/linkedin/urls', () => {
  it('buildLinkedInSearchUrl include keyword, location e filtro tempo', () => {
    const url = buildLinkedInSearchUrl('sviluppatore C#', {
      location: 'Italia',
      postedWithin: 'week',
    });
    assert.match(url, /keywords=sviluppatore/);
    assert.match(url, /location=Italia/);
    assert.match(url, /f_TPR=r604800/);
  });

  it('resolvePostedWithin ha default 24h', () => {
    assert.equal(resolvePostedWithin(), 'r86400');
    assert.equal(resolvePostedWithin('24h'), 'r86400');
  });
});

describe('sources/linkedin/parseJobs', () => {
  it('extractJobIdFromUrl legge id numerico', () => {
    assert.equal(
      extractJobIdFromUrl('https://www.linkedin.com/jobs/view/1234567890/?refId=abc'),
      '1234567890',
    );
  });

  it('normalizeLinkedInJob produce formato unificato', () => {
    const job = normalizeLinkedInJob({
      id: '123',
      title: 'Senior C# Developer',
      company: 'Acme Srl',
      location: 'Milano, Italia',
      url: 'https://www.linkedin.com/jobs/view/123/',
      description: 'Backend .NET',
    });

    assert.equal(job.id, 'linkedin:123');
    assert.equal(job.source, 'LinkedIn');
    assert.equal(job.country, 'Italia');
    assert.equal(job.description, 'Backend .NET');
  });

  it('dedupeRawJobs elimina duplicati per id', () => {
    const jobs = dedupeRawJobs([
      {
        id: '1',
        title: 'A',
        company: 'X',
        location: 'Milano',
        url: 'https://www.linkedin.com/jobs/view/1/',
      },
      {
        id: '1',
        title: 'A',
        company: 'X',
        location: 'Milano',
        url: 'https://www.linkedin.com/jobs/view/1/',
      },
    ]);
    assert.equal(jobs.length, 1);
  });

  it('parseJobsFromFixtureHtml estrae annunci da HTML statico', () => {
    const jobs = parseJobsFromFixtureHtml(fixtureHtml);
    assert.equal(jobs.length, 2);
    assert.equal(jobs[0].title, 'Senior C# Developer');
    assert.equal(jobs[0].company, 'Acme Srl');
    assert.match(jobs[0].location, /Milano/);
    assert.equal(jobs[1].id, 'linkedin:9876543210');
  });
});
