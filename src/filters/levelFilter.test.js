import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRelevantListing, mentionsEuRemote } from '../filters/levelFilter.js';

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
});
