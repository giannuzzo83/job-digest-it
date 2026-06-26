import { fetchAdzunaJobs } from './adzuna.js';
import { fetchRssJobs } from './rss.js';

export async function fetchAllJobs(profile, options = {}) {
  const [adzuna, rss] = await Promise.all([
    fetchAdzunaJobs(profile, options),
    fetchRssJobs(profile),
  ]);

  const byId = new Map();
  for (const job of [...adzuna, ...rss]) {
    if (!job.url) continue;
    if (!byId.has(job.id)) {
      byId.set(job.id, job);
    }
  }

  return [...byId.values()];
}
