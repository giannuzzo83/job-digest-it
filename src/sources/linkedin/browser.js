import { paths } from '../../config.js';
import { buildLinkedInSearchUrl } from './urls.js';
import { dedupeRawJobs, normalizeLinkedInJob } from './parseJobs.js';
import { extractJsonLdJobPosting, parseGuestSearchHtml } from './extract.js';
import { assertSessionNotRestricted, LinkedInRestrictionError } from './guards.js';
import { hasLinkedInSession, resolveSessionPath } from './session.js';
import {
  applyStealthScripts,
  buildBrowserContextOptions,
} from './stealth.js';

export { resolveSessionPath, hasLinkedInSession } from './session.js';

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function humanPause(msMin = 2500, msMax = 6000) {
  await new Promise((resolve) => setTimeout(resolve, randomDelay(msMin, msMax)));
}

async function dismissCookieBanner(page) {
  const selectors = [
    'button[action-type="ACCEPT"]',
    'button:has-text("Accetta")',
    'button:has-text("Accept")',
    'button:has-text("Accetto")',
  ];

  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 800 }).catch(() => false)) {
      await button.click();
      await humanPause(800, 1800);
      return;
    }
  }
}

async function moveMouseLikeHuman(page) {
  const x = randomDelay(120, 900);
  const y = randomDelay(120, 700);
  await page.mouse.move(x, y, { steps: randomDelay(8, 18) });
}

async function humanScrollResults(page, maxScrolls) {
  for (let i = 0; i < maxScrolls; i += 1) {
    await moveMouseLikeHuman(page);
    await page.mouse.wheel(0, randomDelay(350, 750));
    await humanPause(1200, 2800);
  }
}

export async function extractVisibleJobCards(page) {
  const html = await page.content();
  const guestParsed = parseGuestSearchHtml(html);
  if (guestParsed.length > 0) {
    return guestParsed;
  }

  return page.evaluate(() => {
    const selectors = [
      'div.job-card-container',
      'li.jobs-search-results__list-item',
      'li.scaffold-layout__list-item',
      'div.base-search-card',
    ];

    const cards = new Set();
    for (const selector of selectors) {
      for (const card of document.querySelectorAll(selector)) {
        cards.add(card);
      }
    }

    const jobs = [];
    for (const card of cards) {
      const urn = card.getAttribute('data-entity-urn');
      const urnId = urn?.match(/jobPosting:(\d+)/)?.[1];
      const link = card.querySelector('a[href*="/jobs/view/"]');
      if (!link && !urnId) continue;

      const href = link?.href ?? '';
      const idMatch = href.match(/jobs\/view\/(\d+)/);
      const id = urnId ?? idMatch?.[1] ?? null;
      const title =
        card.querySelector('.job-card-list__title, .base-search-card__title, strong')?.textContent?.trim() ||
        link?.textContent?.trim() ||
        '';

      const company =
        card.querySelector(
          '.job-card-container__company-name, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle span, .artdeco-entity-lockup__subtitle',
        )?.textContent?.trim() || '';

      const location =
        card
          .querySelector(
            '.job-card-container__metadata-item, .job-search-card__location, .job-card-container__metadata-wrapper, .artdeco-entity-lockup__caption',
          )
          ?.textContent?.trim() || '';

      jobs.push({
        id,
        url: href ? href.split('?')[0] : id ? `https://www.linkedin.com/jobs/view/${id}/` : '',
        title,
        company,
        location,
        description: '',
      });
    }

    return jobs;
  });
}

async function extractDescriptionFromDetailPane(page) {
  const html = await page.content();
  const jsonLd = extractJsonLdJobPosting(html);
  if (jsonLd?.description) {
    return jsonLd.description;
  }

  return page.evaluate(() => {
    const selectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.show-more-less-html__markup',
      '#job-details .jobs-description-content__text',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.innerText?.trim()) {
        return el.innerText.trim();
      }
    }
    return '';
  });
}

async function enrichJobsWithDescriptions(page, rawJobs, options = {}) {
  const maxDetails = options.maxDetails ?? 12;
  const enriched = [];

  for (const job of rawJobs.slice(0, maxDetails)) {
    assertSessionNotRestricted(page);

    const cardLink = page.locator(`a[href*="/jobs/view/${job.id}"]`).first();
    const visible = await cardLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) {
      enriched.push(job);
      continue;
    }

    await moveMouseLikeHuman(page);
    await cardLink.click();
    await humanPause(2500, 5000);
    await page
      .locator(
        '.jobs-description__content, .jobs-box__html-content, .show-more-less-html__markup, #job-details',
      )
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {});

    const description = await extractDescriptionFromDetailPane(page);
    enriched.push({ ...job, description });
    await humanPause(2500, 5500);
  }

  return [...enriched, ...rawJobs.slice(maxDetails)];
}

export async function browseLinkedInSearch(page, query, options = {}) {
  const url = buildLinkedInSearchUrl(query, options);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  assertSessionNotRestricted(page);
  await humanPause(2000, 4500);
  await dismissCookieBanner(page);

  await page
    .locator(
      'div.jobs-search-results-list, ul.scaffold-layout__list-container, div.scaffold-layout__list, div.base-search-card',
    )
    .first()
    .waitFor({ state: 'visible', timeout: 25_000 })
    .catch(() => {});

  await humanScrollResults(page, options.maxScrolls ?? 5);
  let rawJobs = await extractVisibleJobCards(page);

  if (options.fetchDescriptions !== false && rawJobs.length > 0) {
    rawJobs = await enrichJobsWithDescriptions(page, rawJobs, {
      maxDetails: options.maxDetails ?? options.maxJobsPerQuery ?? 12,
    });
  }

  return rawJobs;
}

export async function browseLinkedInJobs(profile, playwright, runtimeOptions = {}) {
  const opts = runtimeOptions.linkedinOptions ?? {};
  const sessionPath = runtimeOptions.sessionPath ?? resolveSessionPath();

  if (!hasLinkedInSession(sessionPath)) {
    throw new Error(
      `Sessione LinkedIn mancante (${sessionPath}). Esegui: npm run linkedin:login`,
    );
  }

  const queries = opts.queries?.length ? opts.queries : profile.searchQueries ?? [];
  if (queries.length === 0) {
    return [];
  }

  const headless = runtimeOptions.headless ?? opts.headless ?? process.env.LINKEDIN_HEADLESS !== 'false';
  const browser = await playwright.chromium.launch({
    headless,
    slowMo: headless ? 0 : 50,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext(buildBrowserContextOptions(sessionPath));
  await applyStealthScripts(context);

  const page = await context.newPage();
  const allRaw = [];

  try {
    for (const query of queries) {
      console.log(`[linkedin:browser] Ricerca: "${query}" (${opts.location ?? 'Italia'})`);
      const rawJobs = await browseLinkedInSearch(page, query, {
        location: opts.location ?? 'Italia',
        postedWithin: opts.postedWithin ?? '24h',
        maxScrolls: opts.maxScrolls ?? 5,
        maxJobsPerQuery: opts.maxJobsPerQuery ?? 15,
        fetchDescriptions: opts.fetchDescriptions ?? true,
        maxDetails: opts.maxDetails ?? opts.maxJobsPerQuery ?? 12,
      });

      allRaw.push(...rawJobs.slice(0, opts.maxJobsPerQuery ?? 15));
      await humanPause(4000, 9000);
    }
  } catch (err) {
    if (err instanceof LinkedInRestrictionError) {
      console.warn(`[linkedin:browser] ${err.message}`);
    } else {
      throw err;
    }
  } finally {
    await browser.close();
  }

  return dedupeRawJobs(allRaw).map((job) => normalizeLinkedInJob(job)).filter(Boolean);
}
