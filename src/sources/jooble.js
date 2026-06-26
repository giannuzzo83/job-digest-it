import {
  apiOptions,
  buildJobId,
  isApiEnabled,
  sleep,
  stripHtml,
  USER_AGENT,
} from './shared.js';

function defaultQueries(profile) {
  return (profile.searchQueries ?? ['sviluppatore software']).slice(0, 10);
}

export async function fetchJoobleJobs(profile) {
  const apiKey = process.env.JOOBLE_API_KEY;

  if (!apiKey) {
    console.warn('[jooble] Chiave API mancante — salto fonte (registrati su jooble.org/api/about)');
    return [];
  }

  if (!isApiEnabled(profile, 'jooble')) {
    return [];
  }

  const opts = apiOptions(profile, 'jooble');
  const location = opts.location ?? 'Italy';
  const page = String(opts.page ?? 1);
  const queries = opts.queries ?? defaultQueries(profile);
  const jobs = [];
  const seen = new Set();

  for (const keywords of queries) {
    try {
      const res = await fetch(`https://jooble.org/api/${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({
          keywords,
          location,
          page,
          companysearch: 'false',
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.warn(`[jooble] HTTP ${res.status} per "${keywords}": ${body.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      for (const item of data.jobs ?? []) {
        const externalId = String(item.id ?? item.link);
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        const loc = item.location ?? location;
        jobs.push({
          id: buildJobId('jooble', externalId),
          source: 'Jooble Italia',
          title: item.title ?? 'Senza titolo',
          company: item.company ?? 'Azienda non indicata',
          location: loc,
          country: /italy|italia|italian republic/i.test(loc) ? 'Italia' : null,
          url: item.link,
          description: stripHtml(item.snippet ?? ''),
          salaryMin: null,
          salaryMax: null,
          contractType: item.type ?? null,
          postedAt: item.updated ?? null,
        });
      }

      await sleep(350);
    } catch (err) {
      console.warn(`[jooble] Errore query "${keywords}":`, err.message);
    }
  }

  console.log(`[jooble] ${jobs.length} annunci (location=${location})`);
  return jobs;
}
