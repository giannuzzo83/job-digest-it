import { fetchAdzunaJobs } from './adzuna.js';
import { fetchArbeitnowJobs } from './arbeitnow.js';
import { fetchHimalayasJobs } from './himalayas.js';
import { fetchJobicyJobs } from './jobicy.js';
import { fetchJoobleJobs } from './jooble.js';
import { fetchLinkedInJobs } from './linkedin.js';
import { fetchRemoteJobsOrgJobs } from './remotejobs.js';
import { fetchRemoteOkJobs } from './remoteok.js';
import { fetchRemotiveJobs } from './remotive.js';
import { fetchRssJobs } from './rss.js';

export async function fetchAllJobs(profile, options = {}) {
  const [
    adzuna,
    jooble,
    rss,
    jobicy,
    remoteok,
    remotive,
    arbeitnow,
    himalayas,
    remotejobs,
    linkedin,
  ] = await Promise.all([
    fetchAdzunaJobs(profile, options),
    fetchJoobleJobs(profile),
    fetchRssJobs(profile),
    fetchJobicyJobs(profile),
    fetchRemoteOkJobs(profile),
    fetchRemotiveJobs(profile),
    fetchArbeitnowJobs(profile),
    fetchHimalayasJobs(profile),
    fetchRemoteJobsOrgJobs(profile),
    fetchLinkedInJobs(profile),
  ]);

  const byId = new Map();
  for (const job of [
    ...adzuna,
    ...jooble,
    ...rss,
    ...jobicy,
    ...remoteok,
    ...remotive,
    ...arbeitnow,
    ...himalayas,
    ...remotejobs,
    ...linkedin,
  ]) {
    if (!job.url) continue;
    if (!byId.has(job.id)) {
      byId.set(job.id, job);
    }
  }

  return [...byId.values()];
}
