const POSTED_WITHIN_MAP = {
  '24h': 'r86400',
  day: 'r86400',
  week: 'r604800',
  month: 'r2592000',
};

export function resolvePostedWithin(value) {
  if (!value) return 'r86400';
  const key = String(value).toLowerCase();
  return POSTED_WITHIN_MAP[key] ?? 'r86400';
}

export function buildLinkedInSearchUrl(query, options = {}) {
  const params = new URLSearchParams({
    keywords: query,
    location: options.location ?? 'Italia',
    f_TPR: resolvePostedWithin(options.postedWithin),
  });
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}
