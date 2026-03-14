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

  async function initDashboard() {
    const m = window.location.pathname.match(/^\/dashboard\/(\d+)(?:\/|$)/);
    if (!m) return;

    const guildId = m[1];
    const wrap = document.getElementById('dashboardEditor');
    const guildText = document.getElementById('dashboardGuildId');
    const form = document.getElementById('dashboardForm');
    if (!wrap || !guildText || !form) return;

    wrap.style.display = 'block';
    guildText.textContent = guildId;

    const modAutomod = document.getElementById('modAutomod');
    const modTickets = document.getElementById('modTickets');
    const modEconomy = document.getElementById('modEconomy');
    const welcomeMessage = document.getElementById('welcomeMessage');

    try {
      const res = await fetch(`/api/modules/${guildId}`);
      const data = await res.json();
      const c = data?.config || {};
      modAutomod.checked = Boolean(c.automod);
      modTickets.checked = Boolean(c.tickets);
      modEconomy.checked = Boolean(c.economy);
      welcomeMessage.value = c.welcomeMessage || '';
    } catch (_e) {
      showToast('Nie udało się pobrać konfiguracji panelu.', true);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        automod: modAutomod.checked,
        tickets: modTickets.checked,
        economy: modEconomy.checked,
        welcomeMessage: welcomeMessage.value.trim()
      };

      try {
        const res = await fetch(`/api/modules/${guildId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('save failed');
        showToast('Panel zapisany pomyślnie.');
      } catch (_err) {
        showToast('Błąd zapisu panelu.', true);
      }
    });
  }

  const query = new URLSearchParams(window.location.search);
  if (query.has('success')) showToast('Operacja wykonana pomyślnie.');
  if (query.has('canceled')) showToast('Płatność została anulowana.', true);

  fetchStatus();
  setInterval(fetchStatus, 30000);
  initDashboard();
})();
