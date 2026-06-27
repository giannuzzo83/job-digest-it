import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildJobId, isApiEnabled, keepItalyRelevant, stripHtml } from './shared.js';

describe('sources/shared', () => {
  it('buildJobId combina fonte e id esterno', () => {
    assert.equal(buildJobId('jobicy', '42'), 'jobicy:42');
  });

  it('stripHtml rimuove tag e normalizza spazi', () => {
    assert.equal(stripHtml('<p>C# &nbsp; dev</p>'), 'C# dev');
  });

  it('isApiEnabled rispetta jobApis nel profilo', () => {
    assert.equal(isApiEnabled({ jobApis: { jobicy: false } }, 'jobicy'), false);
    assert.equal(isApiEnabled({ jobApis: { jobicy: { enabled: false } } }, 'jobicy'), false);
    assert.equal(isApiEnabled({}, 'jobicy'), true);
  });

  it('keepItalyRelevant accetta annunci con country Italia', () => {
    const profile = { italyKeywords: ['milano', 'roma', 'italia'] };
    assert.equal(
      keepItalyRelevant(
        { title: 'Dev', company: 'X', location: 'Berlin', description: 'backend', country: 'Italia' },
        profile,
      ),
      true,
    );
  });

  it('keepItalyRelevant accetta annunci con keyword Italia nel testo', () => {
    const profile = { italyKeywords: ['milano', 'roma', 'italia'] };
    assert.equal(
      keepItalyRelevant(
        { title: 'Dev', company: 'X', location: 'Remote', description: 'smart working da Milano' },
        profile,
      ),
      true,
    );
  });

  it('keepItalyRelevant accetta remote EU da fonti remote', () => {
    const profile = {
      italyKeywords: ['milano', 'roma', 'italia'],
      euRemoteKeywords: ['europe', 'emea'],
      remoteSources: ['Jobicy'],
    };
    assert.equal(
      keepItalyRelevant(
        {
          source: 'Jobicy',
          title: 'Dev',
          company: 'X',
          location: 'Europe',
          description: 'backend role',
        },
        profile,
      ),
      true,
    );
  });

  it('keepItalyRelevant scarta annunci senza legame con Italia', () => {
    const profile = {
      italyKeywords: ['milano', 'roma', 'italia'],
      euRemoteKeywords: ['europe'],
      remoteSources: ['Jobicy'],
    };
    assert.equal(
      keepItalyRelevant(
        { source: 'Jobicy', title: 'Dev', company: 'X', location: 'Tokyo', description: 'backend role' },
        profile,
      ),
      false,
    );
  });

  it('keepItalyRelevant scarta sedi in Germania anche con keyword EU nel testo', () => {
    const profile = {
      italyKeywords: ['milano', 'roma', 'italia'],
      euRemoteKeywords: ['europe', 'emea'],
      remoteSources: ['Arbeitnow'],
    };
    assert.equal(
      keepItalyRelevant(
        {
          source: 'Arbeitnow',
          title: 'Staff Backend Engineer',
          company: 'Apaleo',
          location: 'München, Bavaria, Germany',
          description: 'European company based in Munich',
        },
        profile,
      ),
      false,
    );
  });
});
