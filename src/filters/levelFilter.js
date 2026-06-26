const NEGATIVE_RE = /\b(junior|jr\.?|trainee|stage|stagista|tirocinio|tirocinante|apprendista|praticant|neolaureat|primo impiego|senza esperienza|entry[\s-]?level|graduate)\b/i;

const POSITIVE_RE = /\b(mid|medior|intermedio|middle|senior|esperto|specialist|3[\s-]?5\s*anni|2[\s-]?3\s*anni|[3-9]\+?\s*anni)\b/i;

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
  return keywords.some((kw) => haystack.includes(normalize(kw)));
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
