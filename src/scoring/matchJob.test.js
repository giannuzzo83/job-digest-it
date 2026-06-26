import test from 'node:test';
import assert from 'node:assert/strict';
import { isMidOrAbove, mentionsItaly } from '../filters/levelFilter.js';
import { filterAndRankJobs, scoreJob } from '../scoring/matchJob.js';

const profile = {
  minSeniority: 'mid',
  minMatchScore: 40,
  seniorityNegative: ['junior', 'stage', 'tirocinio'],
  seniorityPositive: ['mid', 'senior', '3 anni'],
  excludeTerms: ['data entry'],
  italyKeywords: ['italia', 'milano', 'roma', 'remoto'],
  skills: [
    { term: 'c#', weight: 10 },
    { term: 'unity', weight: 10 },
    { term: '.net', weight: 8 },
  ],
};

test('esclude annunci junior', () => {
  assert.equal(isMidOrAbove('Sviluppatore Junior C#', profile), false);
});

test('accetta annunci mid senza keyword esplicita se non junior', () => {
  assert.equal(isMidOrAbove('Sviluppatore C# .NET', profile), true);
});

test('rileva riferimenti Italia', () => {
  assert.equal(mentionsItaly('Lavoro remoto da Milano', profile), true);
  assert.equal(mentionsItaly('Berlin office only', profile), false);
});

test('score alto per unity e c#', () => {
  const { score } = scoreJob(
    {
      title: 'Unity Developer C#',
      company: 'Studio',
      location: 'Milano, Italia',
      description: 'Cerchiamo sviluppatore mid con esperienza Unity e .NET',
    },
    profile,
  );
  assert.ok(score >= 50);
});

test('filtra e ordina per score', () => {
  const jobs = filterAndRankJobs(
    [
      {
        id: '1',
        title: 'Junior Stage',
        company: 'X',
        location: 'Roma',
        description: 'tirocinio',
        url: 'https://example.com/1',
        source: 'test',
      },
      {
        id: '2',
        title: 'Sviluppatore C# Unity',
        company: 'Y',
        location: 'Milano',
        description: 'Mid level, smart working',
        url: 'https://example.com/2',
        source: 'test',
      },
    ],
    profile,
    { minScore: 40 },
  );

  assert.equal(jobs.length, 1);
  assert.match(jobs[0].title, /Unity/);
});
