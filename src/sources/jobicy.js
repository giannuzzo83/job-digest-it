import {
  apiOptions,
  buildJobId,
  fetchJson,
  isApiEnabled,
  stripHtml,
} from './shared.js';

const BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';

export async function fetchJobicyJobs(profile) {
  if (!isApiEnabled(profile, 'jobicy')) {
    return [];
  }

  const opts = apiOptions(profile, 'jobicy');
  const count = opts.count ?? 50;
  const geo = opts.geo ?? 'italy';
  const industry = opts.industry ?? 'dev';

  const params = new URLSearchParams({
    count: String(count),
    geo,
    industry,
  });

  try {
    const data = await fetchJson(`${BASE_URL}?${params.toString()}`);
    const jobs = [];

    for (const item of data.jobs ?? []) {
      const geoLabel = stripHtml((item.jobGeo ?? '').replace(/&amp;/g, '&'));
      const geoNorm = geoLabel.toLowerCase();
      const country =
        geoNorm.includes('italy') || geoNorm.includes('italia') ? 'Italia' : null;

      jobs.push({
        id: buildJobId('jobicy', String(item.id)),
        source: 'Jobicy',
        title: stripHtml(item.jobTitle) || 'Senza titolo',
        company: stripHtml(item.companyName) || 'Azienda non indicata',
        location: geoLabel || 'Remote',
        country,
        url: item.url,
        description: stripHtml(item.jobDescription ?? item.jobExcerpt ?? ''),
        salaryMin: null,
        salaryMax: null,
        contractType: item.jobType?.[0] ?? null,
        postedAt: data.lastUpdate ?? null,
      });
    }

    console.log(`[jobicy] ${jobs.length} annunci (geo=${geo}, industry=${industry})`);
    return jobs;
  } catch (err) {
    console.warn('[jobicy] Errore fetch:', err.message);
    return [];
  }
}
