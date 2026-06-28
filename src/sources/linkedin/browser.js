import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../../config.js';
import { buildLinkedInSearchUrl } from './urls.js';
import { dedupeRawJobs } from './parseJobs.js';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export function resolveSessionPath() {
  return process.env.LINKEDIN_SESSION_PATH ?? path.join(paths.dataDir, 'linkedin-session.json');
}

export function hasLinkedInSession(sessionPath = resolveSessionPath()) {
  return fs.existsSync(sessionPath);
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function humanPause(msMin = 900, msMax = 2400) {
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
      await humanPause(500, 1200);
      return;
    }
  }
}

async function humanScrollResults(page, maxScrolls) {
  for (let i = 0; i < maxScrolls; i += 1) {
    await page.mouse.wheel(0, randomDelay(500, 900));
    await humanPause(700, 1800);
  }
}

export async function extractVisibleJobCards(page) {
  return page.evaluate(() => {
    const selectors = [
      'div.job-card-container',
      'li.jobs-search-results__list-item',
      'li.scaffold-layout__list-item',
    ];

    const cards = new Set();
    for (const selector of selectors) {
      for (const card of document.querySelectorAll(selector)) {
        cards.add(card);
      }
    }

    const jobs = [];
    for (const card of cards) {
      const link = card.querySelector('a[href*="/jobs/view/"]');
      if (!link) continue;

      const href = link.href ?? '';
      const idMatch = href.match(/jobs\/view\/(\d+)/);
      const title =
        link.querySelector('.job-card-list__title, strong')?.textContent?.trim() ||
        link.textContent?.trim() ||
        '';

      const company =
        card.querySelector(
          '.job-card-container__company-name, .artdeco-entity-lockup__subtitle span, .artdeco-entity-lockup__subtitle',
        )?.textContent?.trim() || '';

      const location =
        card
          .querySelector(
            '.job-card-container__metadata-item, .job-card-container__metadata-wrapper, .artdeco-entity-lockup__caption',
          )
          ?.textContent?.trim() || '';

      jobs.push({
        id: idMatch?.[1] ?? null,
        url: href.split('?')[0],
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
  return page.evaluate(() => {
    const selectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
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
    const cardLink = page.locator(`a[href*="/jobs/view/${job.id}"]`).first();
    const visible = await cardLink.isVisible({ timeout: 1500 }).catch(() => false);
    if (!visible) {
      enriched.push(job);
      continue;
    }

    await cardLink.click();
    await humanPause(900, 2000);
    await page
      .locator('.jobs-description__content, .jobs-box__html-content, #job-details')
      .first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});

    const description = await extractDescriptionFromDetailPane(page);
    enriched.push({ ...job, description });
    await humanPause(700, 1600);
  }

  return [...enriched, ...rawJobs.slice(maxDetails)];
}

export async function browseLinkedInSearch(page, query, options = {}) {
  const url = buildLinkedInSearchUrl(query, options);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await humanPause(1200, 2600);
  await dismissCookieBanner(page);

  await page
    .locator('div.jobs-search-results-list, ul.scaffold-layout__list-container, div.scaffold-layout__list')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
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
    slowMo: headless ? 0 : 40,
  });

  const context = await browser.newContext({
    storageState: sessionPath,
    viewport: { width: 1365, height: 900 },
    locale: 'it-IT',
    userAgent: DEFAULT_USER_AGENT,
  });

  const page = await context.newPage();
  const allRaw = [];

  try {
    for (const query of queries) {
      console.log(`[linkedin] Ricerca: "${query}" (${opts.location ?? 'Italia'})`);
      const rawJobs = await browseLinkedInSearch(page, query, {
        location: opts.location ?? 'Italia',
        postedWithin: opts.postedWithin ?? '24h',
        maxScrolls: opts.maxScrolls ?? 5,
        maxJobsPerQuery: opts.maxJobsPerQuery ?? 15,
        fetchDescriptions: opts.fetchDescriptions ?? true,
        maxDetails: opts.maxDetails ?? opts.maxJobsPerQuery ?? 12,
      });

      allRaw.push(...rawJobs.slice(0, opts.maxJobsPerQuery ?? 15));
      await humanPause(1500, 3200);
    }
  } finally {
    await browser.close();
  }

  return dedupeRawJobs(allRaw);
}
