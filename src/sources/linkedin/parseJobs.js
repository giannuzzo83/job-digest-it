import { buildJobId } from '../shared.js';

export function extractJobIdFromUrl(url) {
  const value = String(url ?? '');
  const numeric = value.match(/jobs\/view\/(\d+)/);
  if (numeric) return numeric[1];
  const slug = value.match(/jobs\/view\/[^/?]+-(\d+)/);
  return slug?.[1] ?? null;
}

export function normalizeLinkedInJob(raw) {
  const url = raw.url?.split('?')[0] ?? '';
  const externalId = raw.id ?? extractJobIdFromUrl(url);
  if (!externalId || !url) return null;

  return {
    id: buildJobId('linkedin', externalId),
    source: 'LinkedIn',
    title: raw.title?.trim() || 'Senza titolo',
    company: raw.company?.trim() || 'Azienda non indicata',
    location: raw.location?.trim() || 'Italia',
    country: inferCountry(raw.location),
    url,
    description: raw.description?.trim() ?? '',
    salaryMin: null,
    salaryMax: null,
    contractType: null,
    postedAt: raw.postedAt ?? null,
  };
}

function inferCountry(location) {
  const value = (location ?? '').toLowerCase();
  if (value.includes('ital')) return 'Italia';
  return null;
}

export function dedupeRawJobs(rawJobs) {
  const byId = new Map();
  for (const raw of rawJobs) {
    const normalized = normalizeLinkedInJob(raw);
    if (!normalized) continue;
    if (!byId.has(normalized.id)) {
      byId.set(normalized.id, normalized);
    }
  }
  return [...byId.values()];
}

export function parseJobsFromFixtureHtml(html) {
  const jobs = [];
  const cardRegex =
    /<a[^>]+href="([^"]*\/jobs\/view\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*company[^"]*"[^>]*>([^<]*)<|artdeco-entity-lockup__subtitle[^>]*>\s*<span[^>]*>([^<]*)<)/gi;

  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const [, href, id, titleHtml, companyA, companyB] = match;
    jobs.push({
      id,
      url: href.startsWith('http') ? href : `https://www.linkedin.com${href}`,
      title: stripTags(titleHtml),
      company: stripTags(companyA || companyB || ''),
      location: extractFixtureLocation(html, href),
      description: '',
    });
  }

  return dedupeRawJobs(jobs);
}

function extractFixtureLocation(html, href) {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockRegex = new RegExp(`${escaped}[\\s\\S]{0,500}?metadata-item[^>]*>([^<]+)<`, 'i');
  const match = html.match(blockRegex);
  return stripTags(match?.[1] ?? 'Italia');
}

function stripTags(value) {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
