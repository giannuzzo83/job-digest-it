import {
  apiOptions,
  buildJobId,
  fetchJson,
  isApiEnabled,
  keepItalyRelevant,
  sleep,
  stripHtml,
} from './shared.js';

const BASE_URL = 'https://himalayas.app/jobs/api/search';

function defaultQueries(profile) {
  return (profile.searchQueries ?? ['developer']).slice(0, 5);
}

export async function fetchHimalayasJobs(profile) {
  if (!isApiEnabled(profile, 'himalayas')) {
    return [];
  }

  const opts = apiOptions(profile, 'himalayas');
  const country = opts.country ?? 'italy';
  const limit = opts.limit ?? 20;
  const queries = opts.queries ?? defaultQueries(profile);
  const jobs = [];
  const seen = new Set();

  for (const q of queries) {
    const params = new URLSearchParams({
      country,
      q,
      limit: String(limit),
    });

    try {
      const data = await fetchJson(`${BASE_URL}?${params.toString()}`);

      for (const item of data.jobs ?? []) {
        const externalId = item.guid ?? item.applicationLink;
        if (!externalId || seen.has(externalId)) continue;
        seen.add(externalId);

        const locations = (item.locationRestrictions ?? []).join(', ');
        const hasItaly = (item.locationRestrictions ?? []).some((loc) =>
          /italy|italia/i.test(loc),
        );

        const job = {
          id: buildJobId('himalayas', String(externalId)),
          source: 'Himalayas',
          title: stripHtml(item.title) || 'Senza titolo',
          company: stripHtml(item.companyName) || 'Azienda non indicata',
          location: locations || 'Remote',
          country: hasItaly ? 'Italia' : null,
          url: item.applicationLink,
          description: stripHtml(`${item.excerpt ?? ''} ${item.description ?? ''}`),
          salaryMin: item.minSalary ?? null,
          salaryMax: item.maxSalary ?? null,
          contractType: item.employmentType ?? null,
          postedAt: item.pubDate ? new Date(item.pubDate * 1000).toISOString() : null,
        };

        if (!job.url) continue;
        if (!keepItalyRelevant(job, profile)) continue;

        jobs.push(job);
      }

      await sleep(350);
    } catch (err) {
      console.warn(`[himalayas] Errore query "${q}":`, err.message);
    }
  }

  console.log(`[himalayas] ${jobs.length} annunci rilevanti (country=${country})`);
  return jobs;
}
