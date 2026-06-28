import { apiOptions, isApiEnabled, keepItalyRelevant } from './shared.js';
import { browseLinkedInJobs } from './linkedin/browser.js';
import { fetchGuestLinkedInJobs } from './linkedin/guestApi.js';
import { hasLinkedInSession, resolveSessionPath } from './linkedin/session.js';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

async function fetchViaGuest(profile, opts) {
  return fetchGuestLinkedInJobs(profile, opts);
}

async function fetchViaBrowser(profile, opts) {
  const sessionPath = resolveSessionPath();
  if (!hasLinkedInSession(sessionPath)) {
    console.warn(
      `[linkedin] Sessione assente (${sessionPath}) — salto modalità browser. Esegui: npm run linkedin:login`,
    );
    return [];
  }

  const playwright = await loadPlaywright();
  if (!playwright) {
    console.warn(
      '[linkedin] Playwright non installato — salto modalità browser. Esegui: npm install && npx playwright install chromium',
    );
    return [];
  }

  return browseLinkedInJobs(profile, playwright, {
    linkedinOptions: opts,
    sessionPath,
    headless: opts.headless ?? process.env.LINKEDIN_HEADLESS !== 'false',
  });
}

export async function fetchLinkedInJobs(profile) {
  if (!isApiEnabled(profile, 'linkedin', false)) {
    return [];
  }

  const opts = apiOptions(profile, 'linkedin');
  const mode = opts.mode ?? process.env.LINKEDIN_MODE ?? 'hybrid';

  try {
    let jobs = [];

    if (mode === 'browser') {
      jobs = await fetchViaBrowser(profile, opts);
    } else if (mode === 'guest') {
      jobs = await fetchViaGuest(profile, opts);
    } else {
      try {
        jobs = await fetchViaGuest(profile, opts);
      } catch (guestErr) {
        console.warn(`[linkedin] Guest API fallita (${guestErr.message}) — fallback browser`);
        jobs = await fetchViaBrowser(profile, opts);
      }
    }

    const relevant = jobs.filter((job) => keepItalyRelevant(job, profile));
    console.log(`[linkedin] ${relevant.length} annunci rilevanti per Italia (mode=${mode})`);
    return relevant;
  } catch (err) {
    console.warn('[linkedin] Errore raccolta:', err.message);
    return [];
  }
}
