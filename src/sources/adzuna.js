const BASE_URL = 'https://api.adzuna.com/v1/api/jobs/it/search';

function buildJobId(source, externalId) {
  return `${source}:${externalId}`;
}

function stripHtml(html) {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchAdzunaJobs(profile, options = {}) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn('[adzuna] Chiavi API mancanti — salto fonte (registrati gratis su developer.adzuna.com)');
    return [];
  }

  const queries = profile.searchQueries ?? ['sviluppatore software'];
  const maxDaysOld = options.maxDaysOld ?? 3;
  const resultsPerPage = 20;
  const all = [];
  const seen = new Set();

  for (const what of queries) {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(resultsPerPage),
      what,
      sort_by: 'date',
      max_days_old: String(maxDaysOld),
      content_type: 'application/json',
    });

    const url = `${BASE_URL}/1?${params.toString()}`;

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        const body = await res.text();
        console.warn(`[adzuna] HTTP ${res.status} per "${what}": ${body.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      for (const item of data.results ?? []) {
        const externalId = String(item.id ?? item.adref ?? item.redirect_url);
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        all.push({
          id: buildJobId('adzuna', externalId),
          source: 'Adzuna Italia',
          title: item.title ?? 'Senza titolo',
          company: item.company?.display_name ?? 'Azienda non indicata',
          location: formatLocation(item.location),
          country: 'Italia',
          url: item.redirect_url ?? item.url,
          description: stripHtml(item.description),
          salaryMin: item.salary_min ?? null,
          salaryMax: item.salary_max ?? null,
          contractType: item.contract_type ?? null,
          postedAt: item.created ?? null,
        });
      }

      // Rispetta rate limit free tier (~25/min) con piccola pausa
      await sleep(300);
    } catch (err) {
      console.warn(`[adzuna] Errore query "${what}":`, err.message);
    }
  }

  return all;
}

function formatLocation(location) {
  if (!location) return 'Italia';
  const parts = [location.area?.[0], location.display_name, location.city].filter(Boolean);
  return [...new Set(parts)].join(', ') || 'Italia';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
