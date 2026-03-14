const fs = require('fs');
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BOT_API_URL = (process.env.BOT_API_URL || '').trim();
const BOT_STATUS_PATH = (process.env.BOT_STATUS_PATH || '/internal/status').trim();
const BOT_GUILDS_PATH = (process.env.BOT_GUILDS_PATH || '/internal/guilds').trim();
const BOT_PANELS_PATH = (process.env.BOT_PANELS_PATH || '/internal/panels').trim();
const SHARED_API_SECRET = (process.env.SHARED_API_SECRET || '').trim();
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'https://botv2.pages.dev').trim();
const PANEL_DATA_FILE = path.join(__dirname, '..', 'data', 'panels.json');

app.use((req, res, next) => {
  const reqOrigin = req.get('origin') || '';
  if (CORS_ORIGIN === '*' || reqOrigin === CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN === '*' ? '*' : reqOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-shared-secret');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
});

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});
app.get('/dashboard/:guildId', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_e) {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function normalizeStatus(payload) {
  const allowedStates = ['ok', 'degraded', 'down'];
  const state = allowedStates.includes(payload?.overall?.state) ? payload.overall.state : 'down';
  const percent = Number.isFinite(Number(payload?.overall?.percent))
    ? Math.max(0, Math.min(100, Math.round(Number(payload.overall.percent))))
    : state === 'ok'
      ? 100
      : state === 'degraded'
        ? 60
        : 0;

  return {
    overall: { state, percent },
    ts: payload?.updatedAt || payload?.ts || new Date().toISOString()
  };
}

async function fetchBotJson(pathName) {
  if (!BOT_API_URL) return null;
  const target = new URL(pathName, BOT_API_URL).toString();
  const headers = { Accept: 'application/json' };
  if (SHARED_API_SECRET) headers['x-shared-secret'] = SHARED_API_SECRET;

  const response = await fetch(target, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`Bot API HTTP ${response.status}`);
  }
  return response.json();
}

async function putBotJson(pathName, body) {
  if (!BOT_API_URL) return null;
  const target = new URL(pathName, BOT_API_URL).toString();
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (SHARED_API_SECRET) headers['x-shared-secret'] = SHARED_API_SECRET;

  const response = await fetch(target, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    throw new Error(`Bot API HTTP ${response.status}`);
  }
  return response.json();
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
    const data = await fetchBotJson(BOT_STATUS_PATH);
    return res.json(normalizeStatus(data));
  } catch (_error) {
    return res.status(200).json({
      overall: { state: 'down', percent: 0 },
      ts: new Date().toISOString(),
      note: 'Brak połączenia z hostem bota'
    });
  }
});

app.get('/api/guilds', async (_req, res) => {
  try {
    if (BOT_API_URL) {
      const data = await fetchBotJson(BOT_GUILDS_PATH);
      return res.json({ guilds: data?.guilds || [] });
    }
  } catch (_e) {
    // fallback below
  }

  const localGuilds = readJson(path.join(__dirname, '..', 'data', 'guilds.json'), []);
  return res.json({ guilds: localGuilds });
});

app.get('/api/modules/:guildId', async (req, res) => {
  const { guildId } = req.params;

  try {
    if (BOT_API_URL) {
      const data = await fetchBotJson(`${BOT_PANELS_PATH}/${guildId}`);
      return res.json({ guildId, config: data?.config || {} });
    }
  } catch (_e) {
    // fallback below
  }

  const local = readJson(PANEL_DATA_FILE, {});
  return res.json({ guildId, config: local[guildId] || {} });
});

app.put('/api/modules/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const nextConfig = req.body || {};

  try {
    if (BOT_API_URL) {
      const data = await putBotJson(`${BOT_PANELS_PATH}/${guildId}`, nextConfig);
      return res.json({ guildId, config: data?.config || {} });
    }
  } catch (_e) {
    // fallback below
  }

  const local = readJson(PANEL_DATA_FILE, {});
  local[guildId] = { ...local[guildId], ...nextConfig, updatedAt: new Date().toISOString() };
  writeJson(PANEL_DATA_FILE, local);
  return res.json({ guildId, config: local[guildId] });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'nebulapulse-web' });
});

app.listen(PORT, () => {
  console.log(`[NebulaPulse] Running on http://localhost:${PORT}`);
});
