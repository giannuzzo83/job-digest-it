function escapeHtml(value) {
  return (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return null;
  if (job.salaryMin && job.salaryMax) {
    return `€${job.salaryMin.toLocaleString('it-IT')} – €${job.salaryMax.toLocaleString('it-IT')}/anno`;
  }
  if (job.salaryMin) return `da €${job.salaryMin.toLocaleString('it-IT')}/anno`;
  return `fino a €${job.salaryMax.toLocaleString('it-IT')}/anno`;
}

export function buildDigestEmail({ jobs, profile, date = new Date() }) {
  const dateLabel = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject =
    jobs.length > 0
      ? `Job Digest IT — ${jobs.length} annunci per te (${date.toLocaleDateString('it-IT')})`
      : `Job Digest IT — nessun nuovo annuncio oggi (${date.toLocaleDateString('it-IT')})`;

  const itemsHtml =
    jobs.length === 0
      ? `<p>Oggi non ho trovato nuovi annunci che superano i filtri (Italia, mid+, match profilo). Riprovo domani.</p>`
      : jobs
          .map((job, index) => {
            const salary = formatSalary(job);
            const hasHighlights = (job.highlightTags ?? []).length > 0;
            const titlePrefix = hasHighlights ? '⭐ ' : '';
            const highlightBadges = (job.highlightTags ?? [])
              .map((tag) => `<span style="display:inline-block;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;margin-right:6px;">⭐ ${escapeHtml(tag)}</span>`)
              .join('');
            const reasons = (job.reasons ?? []).map((r) => `<li>${escapeHtml(r)}</li>`).join('');
            return `
        <div style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e5e7eb;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">
            ${index + 1}. <a href="${escapeHtml(job.url)}" style="color:#1d4ed8;text-decoration:none;">${titlePrefix}${escapeHtml(job.title)}</a>
          </h2>
          <p style="margin:0 0 8px;color:#374151;">
            <strong>${escapeHtml(job.company)}</strong> · ${escapeHtml(job.location)} · ${escapeHtml(job.source)}
            ${salary ? ` · <span style="color:#059669;">${escapeHtml(salary)}</span>` : ''}
          </p>
          <p style="margin:0 0 8px;">
            <span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:999px;font-size:13px;font-weight:600;">
              Match ${job.score}%
            </span>
          </p>
          ${highlightBadges ? `<p style="margin:0 0 8px;">${highlightBadges}</p>` : ''}
          ${reasons ? `<ul style="margin:8px 0 0;padding-left:20px;color:#4b5563;font-size:14px;">${reasons}</ul>` : ''}
        </div>`;
          })
          .join('');

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family:Segoe UI,Helvetica,Arial,sans-serif;line-height:1.5;color:#111827;max-width:680px;margin:0 auto;padding:24px;">
  <h1 style="font-size:22px;margin:0 0 4px;">Ciao ${escapeHtml(profile.recipientName ?? 'there')} 👋</h1>
  <p style="margin:0 0 20px;color:#6b7280;">Digest del ${escapeHtml(dateLabel)} — annunci in Italia, livello mid+, filtrati sul tuo profilo tech.</p>
  ${itemsHtml}
  <p style="margin-top:28px;font-size:12px;color:#9ca3af;">
    Job Digest IT · profilo in <code>config/profile.json</code> · fonti gratuite (Adzuna + RSS)
  </p>
</body>
</html>`;

  const textLines = [
    `Ciao ${profile.recipientName ?? ''},`,
    `Digest del ${dateLabel}`,
    '',
  ];

  if (jobs.length === 0) {
    textLines.push('Nessun nuovo annuncio oggi che supera i filtri.');
  } else {
    for (const [i, job] of jobs.entries()) {
      const star = (job.highlightTags ?? []).length > 0 ? '⭐ ' : '';
      const tags = (job.highlightTags ?? []).length > 0 ? ` [${job.highlightTags.join(', ')}]` : '';
      textLines.push(`${i + 1}. ${star}${job.title} — ${job.company} (${job.score}%)${tags}`);
      textLines.push(`   ${job.url}`);
      textLines.push(`   ${(job.reasons ?? []).join(' · ')}`);
      textLines.push('');
    }
  }

  return { subject, html, text: textLines.join('\n') };
}

export async function sendDigestEmail({ to, from, fromName, jobs, profile }) {
  const nodemailer = await import('nodemailer');
  const { subject, html, text } = buildDigestEmail({ jobs, profile });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: fromName ? `"${fromName}" <${from}>` : from,
    to,
    subject,
    text,
    html,
  });
}
