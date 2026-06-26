import { fetchAdzunaJobs } from './adzuna.js';
import { fetchArbeitnowJobs } from './arbeitnow.js';
import { fetchJobicyJobs } from './jobicy.js';
import { fetchRemoteOkJobs } from './remoteok.js';
import { fetchRemotiveJobs } from './remotive.js';
import { fetchRssJobs } from './rss.js';

export async function fetchAllJobs(profile, options = {}) {
  const [adzuna, rss, jobicy, remoteok, remotive, arbeitnow] = await Promise.all([
    fetchAdzunaJobs(profile, options),
    fetchRssJobs(profile),
    fetchJobicyJobs(profile),
    fetchRemoteOkJobs(profile),
    fetchRemotiveJobs(profile),
    fetchArbeitnowJobs(profile),
  ]);

  const byId = new Map();
  for (const job of [...adzuna, ...rss, ...jobicy, ...remoteok, ...remotive, ...arbeitnow]) {
    if (!job.url) continue;
    if (!byId.has(job.id)) {
      byId.set(job.id, job);
    }
  }

  return [...byId.values()];
}
