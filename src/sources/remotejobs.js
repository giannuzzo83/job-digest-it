import {
  apiOptions,
  buildJobId,
  fetchJson,
  isApiEnabled,
  keepItalyRelevant,
  sleep,
  stripHtml,
} from './shared.js';

const BASE_URL = 'https://remotejobs.org/api/v1/jobs';

function defaultQueries(profile) {
  return (profile.searchQueries ?? ['developer']).slice(0, 5);
}

export async function fetchRemoteJobsOrgJobs(profile) {
  if (!isApiEnabled(profile, 'remotejobs')) {
    return [];
  }

  const opts = apiOptions(profile, 'remotejobs');
  const category = opts.category ?? 'programming';
  const limit = opts.limit ?? 30;
  const queries = opts.queries ?? defaultQueries(profile);
  const jobs = [];
  const seen = new Set();

  for (const q of queries) {
    const params = new URLSearchParams({
      category,
      q,
      limit: String(limit),
    });

    try {
      const data = await fetchJson(`${BASE_URL}?${params.toString()}`);

      for (const item of data.data ?? []) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);

        const location = item.location ?? 'Remote';
        const job = {
          id: buildJobId('remotejobs', String(item.id)),
          source: 'RemoteJobs.org',
          title: stripHtml(item.title) || 'Senza titolo',
          company: stripHtml(item.company?.name) || 'Azienda non indicata',
          location,
          country: /italy|italia/i.test(location) ? 'Italia' : null,
          url: item.apply_url ?? item.url,
          description: stripHtml(item.description ?? ''),
          salaryMin: item.salary_min ?? null,
          salaryMax: item.salary_max ?? null,
          contractType: item.type ?? null,
          postedAt: item.published_at ?? item.created_at ?? null,
        };

        if (!job.url) continue;
        if (!keepItalyRelevant(job, profile)) continue;

        jobs.push(job);
      }

      await sleep(350);
    } catch (err) {
      console.warn(`[remotejobs] Errore query "${q}":`, err.message);
    }
  }

  console.log(`[remotejobs] ${jobs.length} annunci rilevanti (category=${category})`);
  return jobs;
}
