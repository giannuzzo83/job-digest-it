import Parser from 'rss-parser';
import { mentionsItaly } from '../filters/levelFilter.js';

const parser = new Parser({
  timeout: 15_000,
  headers: {
    'User-Agent': 'JobDigestIT/1.0 (+https://github.com)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
});

function hashId(source, url) {
  return `${source}:${Buffer.from(url).toString('base64url').slice(0, 48)}`;
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

        jobs.push({
          id: hashId(feed.name, link),
          source: feed.name,
          title,
          company: extractCompany(title, description),
          location: extractLocation(blob) ?? 'Da verificare',
          country: mentionsItaly(blob, profile) ? 'Italia' : null,
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

  return jobs;
}

function extractCompany(title, description) {
  const match = description.match(/(?:company|azienda|employer)[:\s]+([^\n|,.]+)/i);
  if (match) return match[1].trim();
  const atMatch = title.match(/@\s*([^|()]+)/);
  if (atMatch) return atMatch[1].trim();
  return 'Da feed esterno';
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
