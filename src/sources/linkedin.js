import { apiOptions, isApiEnabled, keepItalyRelevant } from './shared.js';
import { browseLinkedInJobs, hasLinkedInSession, resolveSessionPath } from './linkedin/browser.js';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

export async function fetchLinkedInJobs(profile) {
  if (!isApiEnabled(profile, 'linkedin', false)) {
    return [];
  }

  const opts = apiOptions(profile, 'linkedin');
  const sessionPath = resolveSessionPath();

  if (!hasLinkedInSession(sessionPath)) {
    console.warn(
      `[linkedin] Sessione assente (${sessionPath}) — salto fonte. Esegui: npm run linkedin:login`,
    );
    return [];
  }

  const playwright = await loadPlaywright();
  if (!playwright) {
    console.warn('[linkedin] Playwright non installato — salto fonte. Esegui: npm install && npx playwright install chromium');
    return [];
  }

  try {
    const jobs = await browseLinkedInJobs(profile, playwright, {
      linkedinOptions: opts,
      sessionPath,
      headless: opts.headless ?? process.env.LINKEDIN_HEADLESS !== 'false',
    });

    const relevant = jobs.filter((job) => keepItalyRelevant(job, profile));
    console.log(`[linkedin] ${relevant.length} annunci rilevanti per Italia`);
    return relevant;
  } catch (err) {
    console.warn('[linkedin] Errore navigazione:', err.message);
    return [];
  }
}
