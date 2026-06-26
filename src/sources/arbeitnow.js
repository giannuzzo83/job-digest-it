import {
  apiOptions,
  buildJobId,
  fetchJson,
  isApiEnabled,
  keepItalyRelevant,
  sleep,
  stripHtml,
} from './shared.js';

const BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';

export async function fetchArbeitnowJobs(profile) {
  if (!isApiEnabled(profile, 'arbeitnow')) {
    return [];
  }

  const opts = apiOptions(profile, 'arbeitnow');
  const maxPages = opts.maxPages ?? 2;
  const jobs = [];
  let page = 1;
  let nextUrl = BASE_URL;

  try {
    while (page <= maxPages && nextUrl) {
      const data = await fetchJson(nextUrl);
      for (const item of data.data ?? []) {
        const location = item.location ?? '';
        const country =
          /\bitaly\b/i.test(location) || /\bitalia\b/i.test(location) ? 'Italia' : null;

        const job = {
          id: buildJobId('arbeitnow', item.slug ?? item.url),
          source: 'Arbeitnow',
          title: item.title ?? 'Senza titolo',
          company: item.company_name ?? 'Azienda non indicata',
          location: item.remote ? `${location || 'Remote'} (remoto)`.trim() : location || 'Europa',
          country,
          url: item.url,
          description: stripHtml(item.description),
          salaryMin: null,
          salaryMax: null,
          contractType: item.job_types?.[0] ?? null,
          postedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : null,
        };

        if (!job.url) continue;
        if (!keepItalyRelevant(job, profile)) continue;

        jobs.push(job);
      }

      nextUrl = data.links?.next ?? null;
      page += 1;
      if (nextUrl) {
        await sleep(400);
      }
    }

    console.log(`[arbeitnow] ${jobs.length} annunci rilevanti per Italia`);
    return jobs;
  } catch (err) {
    console.warn('[arbeitnow] Errore fetch:', err.message);
    return [];
  }
}
