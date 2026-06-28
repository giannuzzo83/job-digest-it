import { LINKEDIN_USER_AGENT } from './stealth.js';
import { isBlockedHttpStatus } from './guards.js';
import { parseGuestJobDetailHtml, parseGuestSearchHtml } from './extract.js';
import { normalizeLinkedInJob } from './parseJobs.js';

const GUEST_SEARCH_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const GUEST_DETAIL_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting';

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function guestPause(msMin = 2000, msMax = 5000) {
  await new Promise((resolve) => setTimeout(resolve, randomDelay(msMin, msMax)));
}

async function fetchGuestHtml(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8',
      'User-Agent': LINKEDIN_USER_AGENT,
    },
  });

  if (isBlockedHttpStatus(res.status)) {
    throw new Error(`LinkedIn guest API bloccata (HTTP ${res.status})`);
  }
  if (!res.ok) {
    throw new Error(`LinkedIn guest API HTTP ${res.status}`);
  }

  return res.text();
}

export async function fetchGuestSearchPage(query, options = {}) {
  const params = new URLSearchParams({
    keywords: query,
    location: options.location ?? 'Italia',
    start: String(options.start ?? 0),
  });

  const html = await fetchGuestHtml(`${GUEST_SEARCH_URL}?${params.toString()}`);
  return parseGuestSearchHtml(html);
}

export async function fetchGuestJobDetail(jobId) {
  const html = await fetchGuestHtml(`${GUEST_DETAIL_URL}/${jobId}`);
  return parseGuestJobDetailHtml(html);
}

export async function fetchGuestLinkedInJobs(profile, opts = {}) {
  const queries = opts.queries?.length ? opts.queries : profile.searchQueries ?? [];
  const maxJobsPerQuery = opts.maxJobsPerQuery ?? 15;
  const fetchDescriptions = opts.fetchDescriptions !== false;
  const jobs = [];

  for (const query of queries) {
    console.log(`[linkedin:guest] Ricerca: "${query}" (${opts.location ?? 'Italia'})`);
    const pageJobs = await fetchGuestSearchPage(query, {
      location: opts.location ?? 'Italia',
      start: 0,
    });

    const selected = pageJobs.slice(0, maxJobsPerQuery);
    for (const raw of selected) {
      let detail = {};
      if (fetchDescriptions && raw.id) {
        await guestPause();
        try {
          detail = await fetchGuestJobDetail(raw.id);
        } catch (err) {
          console.warn(`[linkedin:guest] Dettaglio ${raw.id} non disponibile:`, err.message);
        }
      }

      const normalized = normalizeLinkedInJob({
        ...raw,
        location: detail.location || raw.location,
        description: detail.description || raw.description,
        postedAt: detail.postedAt || raw.postedAt,
        contractType: detail.employmentType ?? null,
      });
      if (normalized) jobs.push(normalized);
    }

    await guestPause(2500, 6000);
  }

  return dedupeJobs(jobs);
}

function dedupeJobs(jobs) {
  const byId = new Map();
  for (const job of jobs) {
    if (!byId.has(job.id)) byId.set(job.id, job);
  }
  return [...byId.values()];
}
