#!/usr/bin/env node
/**
 * Test rapido fonte LinkedIn (modalità guest, senza login).
 * Uso: npm run linkedin:test
 */
import { loadProfile } from '../src/config.js';
import { fetchGuestLinkedInJobs } from '../src/sources/linkedin/guestApi.js';
import { keepItalyRelevant } from '../src/sources/shared.js';

const profile = loadProfile();
const opts = profile.jobApis?.linkedin ?? {};

const queries = opts.queries?.length
  ? opts.queries
  : ['sviluppatore C#', 'sviluppatore .NET'];

console.log('[linkedin:test] Modalità guest — nessun login richiesto');
console.log(`[linkedin:test] Query: ${queries.join(', ')}`);

const jobs = await fetchGuestLinkedInJobs(profile, {
  ...opts,
  queries,
  maxJobsPerQuery: 3,
  fetchDescriptions: true,
});

const relevant = jobs.filter((job) => keepItalyRelevant(job, profile));

console.log(`\n[linkedin:test] ${jobs.length} annunci scaricati, ${relevant.length} rilevanti per Italia\n`);

for (const [index, job] of relevant.slice(0, 5).entries()) {
  console.log(`${index + 1}. ${job.title} — ${job.company}`);
  console.log(`   ${job.location} · ${job.source}`);
  console.log(`   ${job.url}`);
  console.log(`   Descrizione: ${job.description.slice(0, 120)}…\n`);
}

if (relevant.length === 0 && jobs.length > 0) {
  console.log('[linkedin:test] Nessun annuncio passa il filtro Italia — normale se la ricerca guest restituisce sedi estere.');
  console.log('[linkedin:test] Prova mode=browser dopo npm run linkedin:login per risultati con sessione italiana.');
}

process.exit(0);
