export class LinkedInRestrictionError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'LinkedInRestrictionError';
    this.code = code;
  }
}

export function getRestrictionFromUrl(url) {
  const value = String(url ?? '');
  if (value.includes('/checkpoint/')) return 'checkpoint';
  if (value.includes('/authwall')) return 'authwall';
  if (value.includes('/login')) return 'login';
  return null;
}

export function assertSessionNotRestricted(page) {
  const restriction = getRestrictionFromUrl(page.url());
  if (restriction) {
    throw new LinkedInRestrictionError(
      `Sessione LinkedIn limitata (${restriction}). Ferma lo scraping e ripeti npm run linkedin:login con un account dedicato.`,
      restriction,
    );
  }
}

export function isBlockedHttpStatus(status) {
  return status === 429 || status === 999 || status === 403;
}
