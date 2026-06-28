import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGuestJobDetailHtml, parseGuestSearchHtml } from './extract.js';
import { getRestrictionFromUrl } from './guards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const searchHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'guest-search.html'), 'utf8');
const detailHtml = fs.readFileSync(path.join(__dirname, 'fixtures', 'guest-job-detail.html'), 'utf8');

describe('sources/linkedin/extract guest API', () => {
  it('parseGuestSearchHtml estrae card dalla API guest', () => {
    const jobs = parseGuestSearchHtml(searchHtml);
    assert.ok(jobs.length >= 2);
    assert.equal(jobs[0].id, '4411470318');
    assert.ok(jobs[0].title.length > 0);
    assert.ok(jobs[0].company.length > 0);
    assert.ok(jobs[0].location.length > 0);
    assert.match(jobs[0].url, /4411470318/);
    assert.match(jobs[0].title, /application developer/i);
    assert.equal(jobs[0].company, 'Starbucks');
  });

  it('parseGuestJobDetailHtml estrae descrizione dal dettaglio guest', () => {
    const detail = parseGuestJobDetailHtml(detailHtml);
    assert.ok(detail.description.length > 50);
  });
});

describe('sources/linkedin/guards', () => {
  it('getRestrictionFromUrl rileva checkpoint e authwall', () => {
    assert.equal(getRestrictionFromUrl('https://www.linkedin.com/checkpoint/challenge/'), 'checkpoint');
    assert.equal(getRestrictionFromUrl('https://www.linkedin.com/authwall'), 'authwall');
    assert.equal(getRestrictionFromUrl('https://www.linkedin.com/jobs/search/'), null);
  });
});
