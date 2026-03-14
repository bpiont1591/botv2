(() => {
  const statusEls = {
    chip: document.getElementById('servicePercent'),
    summary: document.getElementById('serviceSummary'),
    updated: document.getElementById('serviceUpdated')
  };

  function showToast(text, error = false) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastText');
    if (!toast || !msg) return;

    msg.textContent = text;
    toast.style.borderColor = error ? 'rgba(239,68,68,.35)' : 'rgba(34,197,94,.35)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3400);
  }

  function applyStatus(state, percent) {
    if (!statusEls.chip || !statusEls.summary) return;

    const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
    statusEls.chip.textContent = `${safePercent}%`;

    if (state === 'ok') {
      statusEls.chip.style.color = '#22c55e';
      statusEls.summary.textContent = 'Wszystkie usługi działają poprawnie.';
      return;
    }

    if (state === 'degraded') {
      statusEls.chip.style.color = '#f59e0b';
      statusEls.summary.textContent = 'Część usług działa ograniczenie.';
      return;
    }

    statusEls.chip.style.color = '#ef4444';
    statusEls.summary.textContent = 'Wykryto problemy z usługami.';
  }

  async function fetchStatus() {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      const data = await res.json();
      applyStatus(data?.overall?.state || 'down', Number(data?.overall?.percent || 0));
      if (statusEls.updated) {
        const ts = data?.ts ? new Date(data.ts) : new Date();
        statusEls.updated.textContent = `Aktualizacja: ${ts.toLocaleString('pl-PL')}`;
      }
    } catch (_e) {
      applyStatus('down', 0);
      if (statusEls.updated) statusEls.updated.textContent = 'Aktualizacja: błąd połączenia';
    }
  }

  const query = new URLSearchParams(window.location.search);
  if (query.has('success')) showToast('Operacja wykonana pomyślnie.');
  if (query.has('canceled')) showToast('Płatność została anulowana.', true);

  fetchStatus();
  setInterval(fetchStatus, 30000);
})();
