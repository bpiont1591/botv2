const fs = require('fs');
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

dotenv.config({ path: path.join(__dirname, '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const BOT_CLIENT_ID = process.env.BOT_CLIENT_ID || '';
const BOT_API_PORT = Number(process.env.BOT_API_PORT || 4100);
const BOT_HOST = process.env.BOT_HOST || '0.0.0.0';
const SHARED_API_SECRET = process.env.SHARED_API_SECRET || '';
const PANEL_DATA_FILE = path.resolve(__dirname, process.env.PANEL_DATA_FILE || '../data/panels.json');
const GUILDS_DATA_FILE = path.resolve(__dirname, process.env.GUILDS_DATA_FILE || '../data/guilds.json');

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

function listGuilds(client) {
  return [...client.guilds.cache.values()].map((g) => ({
    id: g.id,
    name: g.name,
    iconURL: g.iconURL({ size: 128 })
  }));
}

function syncGuilds(client) {
  writeJson(GUILDS_DATA_FILE, listGuilds(client));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  syncGuilds(client);

  if (BOT_TOKEN && BOT_CLIENT_ID) {
    const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
    const commands = [
      new SlashCommandBuilder()
        .setName('panel-link')
        .setDescription('Wyświetla link do panelu konfiguracji serwera')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    ].map((c) => c.toJSON());

    try {
      await rest.put(Routes.applicationCommands(BOT_CLIENT_ID), { body: commands });
      console.log('[Bot] Slash commands registered');
    } catch (err) {
      console.error('[Bot] Failed to register commands:', err.message);
    }
  }
});

client.on('guildCreate', () => syncGuilds(client));
client.on('guildDelete', () => syncGuilds(client));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'panel-link') {
    const panelUrl = `${process.env.WEB_BASE_URL || 'http://localhost:3000'}/dashboard/${interaction.guildId}`;
    await interaction.reply({
      content: `Panel konfiguracji dla **${interaction.guild?.name || 'serwera'}**: ${panelUrl}`,
      ephemeral: true
    });
  }
});

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  if (!SHARED_API_SECRET) return next();
  const token = req.get('x-shared-secret') || '';
  if (token !== SHARED_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
});

app.get('/internal/status', (_req, res) => {
  const online = client.isReady();
  const guildCount = client.guilds.cache.size;

  res.json({
    overall: {
      state: online ? 'ok' : 'down',
      percent: online ? 100 : 0
    },
    bot: {
      online,
      guildCount
    },
    updatedAt: new Date().toISOString()
  });
});

app.get('/internal/guilds', (_req, res) => {
  if (!client.isReady()) {
    return res.json({ guilds: readJson(GUILDS_DATA_FILE, []) });
  }
  const guilds = listGuilds(client);
  writeJson(GUILDS_DATA_FILE, guilds);
  return res.json({ guilds });
});

app.get('/internal/panels/:guildId', (req, res) => {
  const all = readJson(PANEL_DATA_FILE, {});
  const guildId = req.params.guildId;
  return res.json({ guildId, config: all[guildId] || {} });
});

app.put('/internal/panels/:guildId', (req, res) => {
  const all = readJson(PANEL_DATA_FILE, {});
  const guildId = req.params.guildId;
  all[guildId] = {
    ...all[guildId],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  writeJson(PANEL_DATA_FILE, all);
  return res.json({ ok: true, guildId, config: all[guildId] });
});

app.listen(BOT_API_PORT, BOT_HOST, () => {
  console.log(`[Bot API] Running on http://${BOT_HOST}:${BOT_API_PORT}`);
});

if (!BOT_TOKEN) {
  console.warn('[Bot] BOT_TOKEN is empty. Internal API works, but Discord bot is offline.');
} else {
  client.login(BOT_TOKEN).catch((err) => {
    console.error('[Bot] Login failed:', err.message);
  });
}
