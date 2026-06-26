import Parser from 'rss-parser';
import { createHash } from 'node:crypto';
import { mentionsItaly } from '../filters/levelFilter.js';

const parser = new Parser({
  timeout: 15_000,
  headers: {
    'User-Agent': 'JobDigestIT/1.0 (+https://github.com)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
});

function hashId(source, url) {
  const digest = createHash('sha256').update(url).digest('base64url').slice(0, 32);
  return `${source}:${digest}`;
}

function stripHtml(html) {
  return (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchRssJobs(profile) {
  const feeds = profile.rssFeeds ?? [];
  const jobs = [];

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items ?? []) {
        const link = item.link ?? item.guid;
        if (!link) continue;

        const title = item.title ?? 'Senza titolo';
        const description = stripHtml(item.contentSnippet ?? item.content ?? item.summary ?? '');
        const blob = `${title} ${description} ${item.categories?.join(' ') ?? ''}`;

        if (feed.requireItaly && !mentionsItaly(blob, profile)) {
          continue;
        }

        const company = extractCompany(title, description, item);
        const location =
          extractLocation(blob) ?? extractLocationFromUrl(link) ?? (feed.assumeItaly ? 'Italia' : 'Da verificare');

        jobs.push({
          id: hashId(feed.name, link),
          source: feed.name,
          title,
          company,
          location,
          country: feed.assumeItaly || mentionsItaly(blob, profile) ? 'Italia' : null,
          url: link,
          description,
          salaryMin: null,
          salaryMax: null,
          contractType: null,
          postedAt: item.isoDate ?? item.pubDate ?? null,
        });
      }
    } catch (err) {
      console.warn(`[rss] Errore feed "${feed.name}":`, err.message);
    }
  }

  console.log(`[rss] ${jobs.length} annunci da ${feeds.length} feed`);
  return jobs;
}

function extractCompany(title, description, item) {
  const creator = item.creator ?? item['dc:creator'];
  if (creator) return creator.trim();

  const match = description.match(/(?:company|azienda|employer)[:\s]+([^\n|,.]+)/i);
  if (match) return match[1].trim();
  const atMatch = title.match(/@\s*([^|()]+)/);
  if (atMatch) return atMatch[1].trim();
  return 'Da feed esterno';
}

function extractLocationFromUrl(url) {
  const match = (url ?? '').match(
    /-(milano|roma|torino|bologna|firenze|napoli|genova|padova|verona|bari|palermo|remote|remoto)[-_]/i,
  );
  if (!match) return null;
  const city = match[1].toLowerCase();
  if (city === 'remote' || city === 'remoto') return 'Remote';
  return city.charAt(0).toUpperCase() + city.slice(1);
}

function extractLocation(text) {
  const cities = [
    'milano',
    'roma',
    'torino',
    'bologna',
    'firenze',
    'napoli',
    'italia',
    'italy',
    'remote',
    'remoto',
  ];
  const lower = text.toLowerCase();
  const hit = cities.find((c) => lower.includes(c));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : null;
}
