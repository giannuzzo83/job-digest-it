#!/usr/bin/env node
import { initEnv, loadProfile } from './config.js';
import { buildDigestEmail, sendDigestEmail } from './email/sendDigest.js';
import { filterAndRankJobs } from './scoring/matchJob.js';
import { fetchAllJobs } from './sources/index.js';
import { markJobsSent, purgeOldSent, wasAlreadySent } from './storage/db.js';

initEnv();

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

async function main() {
  const profile = loadProfile();
  const maxJobs = Number(process.env.DIGEST_MAX_JOBS ?? profile.maxJobsPerEmail ?? 12);
  const minScore = Number(process.env.DIGEST_MIN_SCORE ?? profile.minMatchScore ?? 45);

  console.log('[digest] Raccolta annunci...');
  const rawJobs = await fetchAllJobs(profile, { maxDaysOld: 3 });
  console.log(`[digest] Trovati ${rawJobs.length} annunci grezzi`);

  const ranked = filterAndRankJobs(rawJobs, profile, { minScore, requireItaly: true });
  console.log(`[digest] ${ranked.length} annunci sopra soglia ${minScore}%`);

  const fresh = ranked.filter((job) => !wasAlreadySent(job.id));
  const selected = fresh.slice(0, maxJobs);
  console.log(`[digest] ${selected.length} nuovi da inviare (max ${maxJobs})`);

  if (dryRun) {
    const preview = buildDigestEmail({ jobs: selected, profile });
    console.log('\n--- ANTEPRIMA EMAIL ---');
    console.log('Oggetto:', preview.subject);
    console.log(preview.text);
    return;
  }

  const to = process.env.DIGEST_TO_EMAIL;
  const from = process.env.DIGEST_FROM_EMAIL ?? process.env.SMTP_USER;
  const fromName = process.env.DIGEST_FROM_NAME ?? 'Job Digest IT';

  if (!to || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error(
      '[digest] Configura .env con DIGEST_TO_EMAIL, SMTP_USER e SMTP_PASS (vedi .env.example)',
    );
    process.exit(1);
  }

  await sendDigestEmail({
    to,
    from,
    fromName,
    jobs: selected,
    profile,
  });

  if (selected.length > 0) {
    markJobsSent(
      selected.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        url: job.url,
        score: job.score,
        source: job.source,
      })),
    );
  }

  purgeOldSent(60);
  console.log(`[digest] Email inviata a ${to} con ${selected.length} annunci`);
}

main().catch((err) => {
  console.error('[digest] Errore:', err);
  process.exit(1);
});
