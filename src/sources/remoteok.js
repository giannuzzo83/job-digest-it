import {
  apiOptions,
  buildJobId,
  fetchJson,
  isApiEnabled,
  keepItalyRelevant,
  stripHtml,
} from './shared.js';

const BASE_URL = 'https://remoteok.com/api';

export async function fetchRemoteOkJobs(profile) {
  if (!isApiEnabled(profile, 'remoteok')) {
    return [];
  }

  const opts = apiOptions(profile, 'remoteok');
  const tags = opts.tags ?? ['dev'];
  const params = new URLSearchParams();
  if (tags.length > 0) {
    params.set('tags', tags.join(','));
  }

  const url = params.size > 0 ? `${BASE_URL}?${params.toString()}` : BASE_URL;

  try {
    const data = await fetchJson(url);
    const jobs = [];

    for (const item of data) {
      if (!item?.id) continue;

      const job = {
        id: buildJobId('remoteok', String(item.id)),
        source: 'Remote OK',
        title: item.position ?? 'Senza titolo',
        company: item.company ?? 'Azienda non indicata',
        location: (item.location ?? 'Remote').replace(/,\s*$/, '').trim() || 'Remote',
        country: null,
        url: item.url ?? item.apply_url,
        description: stripHtml(item.description),
        salaryMin: item.salary_min > 0 ? item.salary_min : null,
        salaryMax: item.salary_max > 0 ? item.salary_max : null,
        contractType: null,
        postedAt: item.date ?? null,
      };

      if (!job.url) continue;
      if (!keepItalyRelevant(job, profile)) continue;

      jobs.push(job);
    }

    console.log(`[remoteok] ${jobs.length} annunci rilevanti per Italia`);
    return jobs;
  } catch (err) {
    console.warn('[remoteok] Errore fetch:', err.message);
    return [];
  }
}
