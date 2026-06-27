import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasExplicitForeignLocation, isRelevantListing, mentionsEuRemote } from '../filters/levelFilter.js';

const profile = {
  italyKeywords: ['italia', 'milano', 'roma'],
  euRemoteKeywords: ['europe', 'emea', 'worldwide'],
  remoteSources: ['Jobicy', 'Remote OK'],
};

describe('filters/levelFilter remote', () => {
  it('mentionsEuRemote rileva zone remote europee', () => {
    assert.equal(mentionsEuRemote('Remote in Europe', profile), true);
    assert.equal(mentionsEuRemote('Solo USA', profile), false);
  });

  it('isRelevantListing accetta remote EU da fonti remote', () => {
    assert.equal(
      isRelevantListing(
        {
          source: 'Jobicy',
          title: 'Backend Engineer',
          company: 'Acme',
          location: 'Europe',
          description: 'Node.js role',
        },
        profile,
      ),
      true,
    );
  });

  it('isRelevantListing richiede Italia per board locali', () => {
    assert.equal(
      isRelevantListing(
        {
          source: 'IProgrammatori.it',
          title: 'Backend Engineer',
          company: 'Acme',
          location: 'Berlin',
          description: 'Node.js role',
        },
        profile,
      ),
      false,
    );
  });

  it('isRelevantListing accetta annunci italiani da qualsiasi fonte', () => {
    assert.equal(
      isRelevantListing(
        {
          source: 'IProgrammatori.it',
          title: 'C# Developer',
          company: 'Acme',
          location: 'Milano',
          description: 'Smart working',
          country: 'Italia',
        },
        profile,
      ),
      true,
    );
  });

  it('isRelevantListing scarta sedi estere esplicite anche da fonti remote', () => {
    assert.equal(
      hasExplicitForeignLocation(
        {
          title: 'Staff Backend Engineer',
          company: 'Apaleo',
          location: 'München, Bavaria, Germany',
          description: 'European fintech',
        },
        profile,
      ),
      true,
    );
    assert.equal(
      isRelevantListing(
        {
          source: 'Arbeitnow',
          title: 'Staff Backend Engineer (.NET)',
          company: 'Apaleo',
          location: 'München, Bavaria, Germany',
          description: 'We are a European company hiring in Munich',
        },
        { ...profile, remoteSources: ['Arbeitnow'] },
      ),
      false,
    );
  });

  it('isRelevantListing mantiene remote EU senza sede estera esplicita', () => {
    assert.equal(
      isRelevantListing(
        {
          source: 'Arbeitnow',
          title: 'Backend Engineer',
          company: 'Acme',
          location: 'Remote (Europe)',
          description: 'Fully remote role for European candidates',
        },
        { ...profile, remoteSources: ['Arbeitnow'] },
      ),
      true,
    );
  });
});
