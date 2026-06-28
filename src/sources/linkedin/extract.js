import { stripHtml } from '../shared.js';

export function extractJsonLdJobPosting(html) {
  const scripts = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!scripts) return null;

  for (const block of scripts) {
    const payload = block.replace(/<\/?script[^>]*>/gi, '').trim();
    try {
      const data = JSON.parse(payload);
      const postings = Array.isArray(data)
        ? data
        : data['@graph']
          ? data['@graph']
          : [data];
      for (const item of postings) {
        if (item?.['@type'] === 'JobPosting') {
          return normalizeJsonLdPosting(item);
        }
      }
    } catch {
      // prova il prossimo blocco
    }
  }

  return null;
}

function normalizeJsonLdPosting(data) {
  const address = data.jobLocation?.address ?? data.jobLocation?.[0]?.address ?? {};
  const locationParts = [address.addressLocality, address.addressRegion, address.addressCountry]
    .filter(Boolean)
    .join(', ');

  return {
    title: data.title ?? '',
    company: data.hiringOrganization?.name ?? '',
    location: locationParts || address.addressCountry || '',
    description: stripHtml(data.description ?? ''),
    postedAt: data.datePosted ?? null,
    url: data.url ?? null,
    employmentType: data.employmentType ?? null,
  };
}

export function parseGuestSearchHtml(html) {
  const chunks = html.split('data-entity-urn="urn:li:jobPosting:').slice(1);
  const jobs = [];

  for (const chunk of chunks) {
    const idMatch = chunk.match(/^(\d+)/);
    if (!idMatch) continue;

    const id = idMatch[1];
    const title = extractTitle(chunk);
    const company = extractCompany(chunk);
    const location = extractTagText(chunk, /job-search-card__location">\s*([\s\S]*?)\s*<\/span>/i);
    const postedAt = chunk.match(/job-search-card__listdate[^>]*datetime="([^"]+)"/i)?.[1] ?? null;
    const url =
      chunk.match(/base-card__full-link[^>]*href="([^"]+)"/i)?.[1] ??
      `https://www.linkedin.com/jobs/view/${id}/`;

    jobs.push({
      id,
      title,
      company,
      location,
      url: url.startsWith('http') ? url.split('?')[0] : `https://www.linkedin.com${url.split('?')[0]}`,
      description: '',
      postedAt,
    });
  }

  return jobs;
}

export function parseGuestJobDetailHtml(html) {
  const jsonLd = extractJsonLdJobPosting(html);
  const descriptionMarkup = html.match(
    /show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>\s*<button class="show-more-less-html__button/i,
  )?.[1];

  return {
    description: jsonLd?.description || stripHtml(descriptionMarkup ?? ''),
    postedAt: jsonLd?.postedAt ?? null,
    employmentType: jsonLd?.employmentType ?? null,
    location: jsonLd?.location ?? null,
  };
}

function extractTitle(chunk) {
  const h3Match = chunk.match(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/i);
  return stripHtml(h3Match?.[1] ?? '');
}

function extractCompany(chunk) {
  const h4Match = chunk.match(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/i);
  const inner = h4Match?.[1] ?? '';
  const linkMatch = inner.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  return stripHtml(linkMatch?.[1] ?? inner);
}

function extractTagText(chunk, pattern) {
  const match = chunk.match(pattern);
  return stripHtml(match?.[1] ?? '');
}
