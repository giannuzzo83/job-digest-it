import {
  apiOptions,
  buildJobId,
  fetchJson,
  isApiEnabled,
  keepItalyRelevant,
  stripHtml,
} from './shared.js';

const BASE_URL = 'https://remotive.com/api/remote-jobs';

export async function fetchRemotiveJobs(profile) {
  if (!isApiEnabled(profile, 'remotive')) {
    return [];
  }

  const opts = apiOptions(profile, 'remotive');
  const category = opts.category ?? 'software-dev';
  const params = new URLSearchParams();
  if (category) {
    params.set('category', category);
  }

  const url = params.size > 0 ? `${BASE_URL}?${params.toString()}` : BASE_URL;

  try {
    const data = await fetchJson(url);
    const jobs = [];

    for (const item of data.jobs ?? []) {
      const location = item.candidate_required_location ?? 'Remote';
      const country =
        /\bitaly\b/i.test(location) || /\bitalia\b/i.test(location) ? 'Italia' : null;

      const job = {
        id: buildJobId('remotive', String(item.id)),
        source: 'Remotive',
        title: item.title ?? 'Senza titolo',
        company: item.company_name ?? 'Azienda non indicata',
        location,
        country,
        url: item.url,
        description: stripHtml(item.description),
        salaryMin: null,
        salaryMax: null,
        contractType: item.job_type ?? null,
        postedAt: item.publication_date ?? null,
      };

      if (!job.url) continue;
      if (!keepItalyRelevant(job, profile)) continue;

      jobs.push(job);
    }

    console.log(`[remotive] ${jobs.length} annunci rilevanti per Italia`);
    return jobs;
  } catch (err) {
    console.warn('[remotive] Errore fetch:', err.message);
    return [];
  }
}
