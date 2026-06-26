import test from 'node:test';
import assert from 'node:assert/strict';
import { isMidOrAbove, mentionsItaly } from '../filters/levelFilter.js';
import { filterAndRankJobs, scoreJob } from './matchJob.js';
import { buildDigestEmail } from '../email/sendDigest.js';

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

test('rileva highlightTags e mostra stellina nelle reason', () => {
  const aiProfile = {
    ...profile,
    highlightTags: ['copilot', 'vibe coding'],
    skills: [...profile.skills, { term: 'copilot', weight: 7 }, { term: 'vibe coding', weight: 7 }],
  };

  const result = scoreJob(
    {
      title: 'Senior Developer',
      company: 'AI Studio',
      location: 'Milano',
      description: 'Esperienza con GitHub Copilot e vibe coding in team mid',
    },
    aiProfile,
  );

  assert.ok(result.highlightTags.includes('copilot'));
  assert.ok(result.reasons.some((r) => r.includes('⭐') && r.includes('copilot')));
});

test('filterAndRankJobs propaga highlightTags', () => {
  const aiProfile = {
    ...profile,
    highlightTags: ['llm'],
    skills: [...profile.skills, { term: 'llm', weight: 7 }],
  };

  const jobs = filterAndRankJobs(
    [
      {
        id: '1',
        title: 'LLM Engineer',
        company: 'Lab',
        location: 'Roma',
        description: 'Mid level, lavoro con LLM e API',
        url: 'https://example.com/1',
        source: 'test',
      },
    ],
    aiProfile,
    { minScore: 30 },
  );

  assert.equal(jobs[0].highlightTags?.includes('llm'), true);
});

test('email mostra stellina su annunci con highlightTags', () => {
  const { html, text } = buildDigestEmail({
    profile: { recipientName: 'Mario' },
    jobs: [
      {
        title: 'AI Engineer',
        company: 'Lab',
        location: 'Milano',
        source: 'test',
        url: 'https://example.com',
        score: 80,
        highlightTags: ['copilot'],
        reasons: ['Competenza: ⭐ copilot'],
      },
    ],
  });

  assert.match(html, /⭐ AI Engineer/);
  assert.match(html, /⭐ copilot/);
  assert.match(text, /⭐ AI Engineer/);
});
