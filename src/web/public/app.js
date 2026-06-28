const state = {
  runs: [],
  currentRun: null,
  jobs: [],
  filtered: [],
  selectedJobId: null,
};

const els = {
  runMeta: document.getElementById('run-meta'),
  runSelect: document.getElementById('run-select'),
  search: document.getElementById('search'),
  sourceFilter: document.getElementById('source-filter'),
  minScore: document.getElementById('min-score'),
  emailOnly: document.getElementById('email-only'),
  jobList: document.getElementById('job-list'),
  resultsCount: document.getElementById('results-count'),
  emptyState: document.getElementById('empty-state'),
  detailPanel: document.getElementById('detail-panel'),
  detailContent: document.getElementById('detail-content'),
  closeDetail: document.getElementById('close-detail'),
  cardTemplate: document.getElementById('job-card-template'),
};

function getToken() {
  return new URLSearchParams(window.location.search).get('token') ?? '';
}

async function api(path) {
  const token = getToken();
  const suffix = token ? `${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : '';
  const res = await fetch(`${path}${suffix}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Errore di rete');
  }
  return data;
}

function formatDate(value) {
  return new Date(value).toLocaleString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return null;
  if (job.salaryMin && job.salaryMax) {
    return `€${job.salaryMin.toLocaleString('it-IT')} – €${job.salaryMax.toLocaleString('it-IT')}/anno`;
  }
  if (job.salaryMin) return `da €${job.salaryMin.toLocaleString('it-IT')}/anno`;
  return `fino a €${job.salaryMax.toLocaleString('it-IT')}/anno`;
}

function escapeHtml(value) {
  return (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text, max = 180) {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function updateRunMeta(run) {
  const emailCount = run.jobs.filter((job) => job.inEmail).length;
  els.runMeta.textContent = `${formatDate(run.runAt)} · ${run.totalRanked} annunci sopra ${run.minScore}% · ${emailCount} in email`;
  els.minScore.value = run.minScore;
}

function populateSourceFilter(jobs) {
  const sources = [...new Set(jobs.map((job) => job.source))].sort();
  const current = els.sourceFilter.value;
  els.sourceFilter.innerHTML = '<option value="">Tutte</option>';
  for (const source of sources) {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source;
    els.sourceFilter.appendChild(option);
  }
  els.sourceFilter.value = sources.includes(current) ? current : '';
}

function applyFilters() {
  const query = els.search.value.trim().toLowerCase();
  const source = els.sourceFilter.value;
  const minScore = Number(els.minScore.value) || 0;
  const emailOnly = els.emailOnly.checked;

  state.filtered = state.jobs
    .filter((job) => job.score >= minScore)
    .filter((job) => !source || job.source === source)
    .filter((job) => !emailOnly || job.inEmail)
    .filter((job) => {
      if (!query) return true;
      const blob = `${job.title} ${job.company} ${job.location} ${job.description} ${(job.reasons ?? []).join(' ')}`.toLowerCase();
      return blob.includes(query);
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'it'));

  renderJobList();
}

function renderJobList() {
  els.jobList.innerHTML = '';
  els.resultsCount.textContent = `${state.filtered.length} annunci`;
  els.emptyState.classList.toggle('hidden', state.filtered.length > 0);

  for (const job of state.filtered) {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.jobId = job.id;
    node.querySelector('.score-badge').textContent = `${job.score}%`;
    node.querySelector('.source-pill').textContent = job.source;
    node.querySelector('.job-title').textContent = `${job.highlightTags?.length ? '⭐ ' : ''}${job.title}`;
    const salary = formatSalary(job);
    node.querySelector('.job-meta').textContent = [job.company, job.location, salary].filter(Boolean).join(' · ');

    const tagRow = node.querySelector('.tag-row');
    for (const tag of job.highlightTags ?? []) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = `⭐ ${tag}`;
      tagRow.appendChild(span);
    }

    const badgeRow = node.querySelector('.badge-row');
    if (job.inEmail) {
      const badge = document.createElement('span');
      badge.className = 'badge email';
      badge.textContent = 'In email';
      badgeRow.appendChild(badge);
    }
    if (job.alreadySent) {
      const badge = document.createElement('span');
      badge.className = 'badge sent';
      badge.textContent = 'Già inviato';
      badgeRow.appendChild(badge);
    }

    if (state.selectedJobId === job.id) {
      node.classList.add('active');
    }

    node.addEventListener('click', () => selectJob(job.id));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectJob(job.id);
      }
    });

    els.jobList.appendChild(node);
  }
}

function selectJob(jobId) {
  state.selectedJobId = jobId;
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) return;

  for (const card of els.jobList.querySelectorAll('.job-card')) {
    card.classList.toggle('active', card.dataset.jobId === jobId);
  }

  const salary = formatSalary(job);
  const reasons = (job.reasons ?? [])
    .map((reason) => `<span>${escapeHtml(reason)}</span>`)
    .join('');
  const tags = (job.highlightTags ?? [])
    .map((tag) => `<span class="tag">⭐ ${escapeHtml(tag)}</span>`)
    .join('');

  els.detailContent.innerHTML = `
    <h2>${escapeHtml(job.title)}</h2>
    <p class="meta">
      <strong>${escapeHtml(job.company)}</strong><br>
      ${escapeHtml(job.location)} · ${escapeHtml(job.source)} · Match ${job.score}%
      ${salary ? `<br>${escapeHtml(salary)}` : ''}
      ${job.postedAt ? `<br>Pubblicato: ${escapeHtml(formatDate(job.postedAt))}` : ''}
    </p>
    ${tags ? `<div class="tag-row">${tags}</div>` : ''}
    ${reasons ? `<div class="reason-list">${reasons}</div>` : ''}
    <p class="description">${escapeHtml(truncate(job.description, 1200))}</p>
    <div class="actions">
      <a class="button" href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">Apri annuncio</a>
    </div>
  `;

  els.detailPanel.classList.remove('hidden');
}

function populateRunSelect() {
  els.runSelect.innerHTML = '';
  for (const run of state.runs) {
    const option = document.createElement('option');
    option.value = String(run.id);
    option.textContent = `${formatDate(run.runAt)} (${run.totalRanked})`;
    els.runSelect.appendChild(option);
  }
}

async function loadRun(runId) {
  const run = runId ? await api(`/api/digest/runs/${runId}`) : await api('/api/digest/latest');
  state.currentRun = run;
  state.jobs = run.jobs;
  state.selectedJobId = null;
  els.detailPanel.classList.add('hidden');
  updateRunMeta(run);
  populateSourceFilter(run.jobs);
  applyFilters();
  els.runSelect.value = String(run.id);
}

function showError(message) {
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.textContent = message;
  document.body.prepend(banner);
  els.runMeta.textContent = 'Nessun dato disponibile';
}

function bindEvents() {
  for (const el of [els.search, els.sourceFilter, els.minScore, els.emailOnly]) {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  }

  els.runSelect.addEventListener('change', async () => {
    try {
      await loadRun(els.runSelect.value);
    } catch (error) {
      showError(error.message);
    }
  });

  els.closeDetail.addEventListener('click', () => {
    state.selectedJobId = null;
    els.detailPanel.classList.add('hidden');
    for (const card of els.jobList.querySelectorAll('.job-card')) {
      card.classList.remove('active');
    }
  });
}

async function init() {
  bindEvents();
  try {
    const { runs } = await api('/api/digest/runs');
    state.runs = runs;
    populateRunSelect();
    await loadRun();
  } catch (error) {
    showError(error.message);
  }
}

init();
