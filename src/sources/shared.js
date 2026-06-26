import { mentionsItaly } from '../filters/levelFilter.js';

export const USER_AGENT = 'JobDigestIT/1.0 (+https://github.com)';

export function buildJobId(source, externalId) {
  return `${source}:${externalId}`;
}

export function stripHtml(html) {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jobBlob(job) {
  return `${job.title} ${job.company} ${job.location} ${job.description}`;
}

export function isApiEnabled(profile, key, defaultEnabled = true) {
  const apis = profile.jobApis ?? {};
  if (apis[key] === false) return false;
  if (apis[key] === true) return true;
  if (typeof apis[key] === 'object' && apis[key]?.enabled === false) return false;
  return defaultEnabled;
}

export function apiOptions(profile, key) {
  const apis = profile.jobApis ?? {};
  const value = apis[key];
  return typeof value === 'object' && value !== null ? value : {};
}

export function keepItalyRelevant(job, profile) {
  if (job.country && job.country.toLowerCase().includes('ital')) {
    return true;
  }
  return mentionsItaly(jobBlob(job), profile);
}

export async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...options.headers,
    },
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}
