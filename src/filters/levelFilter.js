const NEGATIVE_RE = /\b(junior|jr\.?|trainee|stage|stagista|tirocinio|tirocinante|apprendista|praticant|neolaureat|primo impiego|senza esperienza|entry[\s-]?level|graduate)\b/i;

const POSITIVE_RE = /\b(mid|medior|intermedio|middle|senior|esperto|specialist|3[\s-]?5\s*anni|2[\s-]?3\s*anni|[3-9]\+?\s*anni)\b/i;

const DEFAULT_FOREIGN_LOCATION_KEYWORDS = [
  'germany',
  'deutschland',
  'munich',
  'munchen',
  'berlin',
  'frankfurt',
  'hamburg',
  'cologne',
  'koln',
  'dusseldorf',
  'bavaria',
  'bayern',
  'france',
  'paris',
  'lyon',
  'marseille',
  'spain',
  'espana',
  'madrid',
  'barcelona',
  'portugal',
  'lisbon',
  'lisboa',
  'united kingdom',
  'london',
  'england',
  'scotland',
  'manchester',
  'netherlands',
  'holland',
  'amsterdam',
  'rotterdam',
  'belgium',
  'brussels',
  'bruxelles',
  'switzerland',
  'schweiz',
  'zurich',
  'geneva',
  'bern',
  'austria',
  'wien',
  'vienna',
  'poland',
  'warsaw',
  'krakow',
  'czech',
  'prague',
  'praha',
  'romania',
  'bucharest',
  'hungary',
  'budapest',
  'sweden',
  'stockholm',
  'denmark',
  'copenhagen',
  'norway',
  'oslo',
  'finland',
  'helsinki',
  'ireland',
  'dublin',
  'united states',
  'new york',
  'san francisco',
  'california',
  'canada',
  'toronto',
  'vancouver',
  'india',
  'bangalore',
  'mumbai',
  'australia',
  'sydney',
  'melbourne',
];

export function isMidOrAbove(text, profile) {
  const haystack = normalize(text);
  if (!haystack) return true;

  const negatives = profile.seniorityNegative ?? [];
  for (const term of negatives) {
    if (haystack.includes(normalize(term))) {
      return false;
    }
  }

  if (NEGATIVE_RE.test(haystack)) {
    return false;
  }

  if (profile.minSeniority === 'mid') {
    if (POSITIVE_RE.test(haystack)) {
      return true;
    }
    // Annunci senza indicazione seniority: li teniamo se il resto del match è buono
    return !NEGATIVE_RE.test(haystack);
  }

  return true;
}

export function mentionsItaly(text, profile) {
  const haystack = normalize(text);
  const keywords = profile.italyKeywords ?? ['italia', 'italy'];
  return keywords.some((kw) => keywordMatches(haystack, kw));
}

export function mentionsEuRemote(text, profile) {
  const haystack = normalize(text);
  const keywords = profile.euRemoteKeywords ?? [
    'europe',
    'european',
    'emea',
    'eea',
    'worldwide',
    'anywhere',
    'work from anywhere',
    'fully remote',
    'remote first',
  ];
  return keywords.some((kw) => keywordMatches(haystack, kw));
}

function keywordMatches(haystack, keyword) {
  const term = normalize(keyword);
  if (!term) return false;
  if (term.length <= 3) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(term)}(?:[^a-z0-9]|$)`).test(haystack);
  }
  return haystack.includes(term);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isRemoteJobSource(job, profile) {
  const sources = profile.remoteSources ?? [
    'Jobicy',
    'Remote OK',
    'Remotive',
    'Arbeitnow',
    'We Work Remotely',
  ];
  return sources.includes(job.source);
}

export function hasExplicitForeignLocation(job, profile) {
  if (job.country && !normalize(job.country).includes('ital')) {
    return true;
  }

  const location = normalize(job.location ?? '');
  if (!location) return false;
  if (mentionsItaly(location, profile)) return false;

  const keywords = profile.foreignLocationKeywords ?? DEFAULT_FOREIGN_LOCATION_KEYWORDS;
  return keywords.some((kw) => keywordMatches(location, kw));
}

export function isRelevantListing(job, profile) {
  if (isItalianListing(job, profile)) {
    return true;
  }

  if (hasExplicitForeignLocation(job, profile)) {
    return false;
  }

  if (!isRemoteJobSource(job, profile)) {
    return false;
  }

  const blob = `${job.title} ${job.company} ${job.location} ${job.description}`;
  return mentionsEuRemote(blob, profile);
}

export function hasExcludedTerms(text, profile) {
  const haystack = normalize(text);
  const terms = profile.excludeTerms ?? [];
  return terms.some((term) => haystack.includes(normalize(term)));
}

export function isItalianListing(job, profile) {
  if (job.country && normalize(job.country).includes('ital')) {
    return true;
  }
  if (job.location && mentionsItaly(job.location, profile)) {
    return true;
  }
  const blob = `${job.title} ${job.company} ${job.location} ${job.description}`;
  return mentionsItaly(blob, profile);
}

function normalize(value) {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
