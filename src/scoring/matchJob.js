import { hasExcludedTerms, isMidOrAbove, isRelevantListing } from '../filters/levelFilter.js';

function normalize(value) {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreJob(job, profile) {
  const blob = normalize(
    `${job.title} ${job.company} ${job.location} ${job.description} ${job.contractType ?? ''}`,
  );

  if (hasExcludedTerms(blob, profile)) {
    return { score: 0, reasons: ['Escluso: ruolo non in linea con il profilo'] };
  }

  if (!isMidOrAbove(blob, profile)) {
    return { score: 0, reasons: ['Escluso: livello junior/stage'] };
  }

  let score = 20;
  const reasons = [];

  const skills = profile.skills ?? [];
  let skillHits = 0;
  for (const skill of skills) {
    const term = normalize(skill.term);
    if (!term) continue;
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(term)}(?:[^a-z0-9]|$)`, 'i');
    if (pattern.test(blob)) {
      score += skill.weight ?? 5;
      skillHits += 1;
      if (reasons.length < 4) {
        reasons.push(`Competenza: ${skill.term}`);
      }
    }
  }

  if (skillHits === 0) {
    score -= 15;
  }

  const positives = profile.seniorityPositive ?? [];
  if (positives.some((p) => blob.includes(normalize(p)))) {
    score += 8;
    reasons.push('Livello mid/senior esplicito');
  }

  if (/\b(remote|remoto|smart working|ibrido|hybrid)\b/i.test(blob)) {
    score += 5;
    reasons.push('Modalità flessibile');
  }

  if (job.salaryMin || job.salaryMax) {
    score += 4;
    reasons.push('Retribuzione indicata');
  }

  if (job.postedAt) {
    const ageDays = (Date.now() - new Date(job.postedAt).getTime()) / 86_400_000;
    if (ageDays <= 2) score += 6;
    else if (ageDays <= 7) score += 3;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (reasons.length === 0) {
    reasons.push('Match generico sul profilo tech');
  }

  return { score, reasons: [...new Set(reasons)].slice(0, 4) };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function filterAndRankJobs(jobs, profile, options = {}) {
  const minScore = options.minScore ?? profile.minMatchScore ?? 45;
  const requireItaly = options.requireItaly ?? true;

  const scored = [];

  for (const job of jobs) {
    if (requireItaly && !isRelevantListing(job, profile)) {
      continue;
    }

    const { score, reasons } = scoreJob(job, profile);
    if (score < minScore) continue;

    scored.push({ ...job, score, reasons });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDate = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const bDate = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    return bDate - aDate;
  });

  return scored;
}
