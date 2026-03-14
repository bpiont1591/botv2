const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BOT_API_URL = (process.env.BOT_API_URL || '').trim();
const BOT_STATUS_PATH = (process.env.BOT_STATUS_PATH || '/internal/status').trim();

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

function normalizeStatus(payload) {
  const state = payload?.overall?.state;
  const allowed = ['ok', 'degraded', 'down'];
  const normalizedState = allowed.includes(state) ? state : 'down';

  const rawPercent = Number(payload?.overall?.percent);
  const percent = Number.isFinite(rawPercent)
    ? Math.max(0, Math.min(100, Math.round(rawPercent)))
    : normalizedState === 'ok'
      ? 100
      : normalizedState === 'degraded'
        ? 60
        : 0;

  const updatedAt = payload?.updatedAt || new Date().toISOString();

  return {
    overall: { state: normalizedState, percent },
    ts: updatedAt
  };
}

app.get('/api/status', async (_req, res) => {
  if (!BOT_API_URL) {
    return res.json({
      overall: { state: 'degraded', percent: 50 },
      ts: new Date().toISOString(),
      note: 'BOT_API_URL nie jest ustawiony. Skonfiguruj .env'
    });
  }

  try {
    const target = new URL(BOT_STATUS_PATH, BOT_API_URL).toString();
    const response = await fetch(target, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return res.status(200).json({
        overall: { state: 'down', percent: 0 },
        ts: new Date().toISOString(),
        note: `Host bota zwrócił HTTP ${response.status}`
      });
    }

    const data = await response.json();
    return res.json(normalizeStatus(data));
  } catch (error) {
    return res.status(200).json({
      overall: { state: 'down', percent: 0 },
      ts: new Date().toISOString(),
      note: 'Brak połączenia z hostem bota'
    });
  }
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'nebulapulse-web' });
});

app.listen(PORT, () => {
  console.log(`[NebulaPulse] Running on http://localhost:${PORT}`);
});
