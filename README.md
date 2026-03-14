# NebulaPulse — Landing + Panel API + Discord Bot (osobny folder)

Gotowy projekt, gdzie:
- **Web + API panelu** działa w katalogu głównym
- **Bot Discord** działa w osobnym folderze `bot/`
- klient po dodaniu bota na serwer może wejść na `.../dashboard/:guildId` i edytować moduły panelu

## Struktura

- `index.html` — landing + widok edytora dashboardu
- `assets/styles.css` — style
- `assets/app.js` — status + edytor modułów dashboardu
- `api/server.js` — API webowe (`/api/status`, `/api/guilds`, `/api/modules/:guildId`)
- `bot/index.js` — bot Discord + wewnętrzne API (`/internal/*`)
- `data/panels.json` — zapis konfiguracji modułów
- `data/guilds.json` — snapshot serwerów, na których jest bot

## Jak to działa (osobne hosty)

1. Użytkownik dodaje bota na serwer Discord.
2. Bot synchronizuje listę guild do `data/guilds.json` i odpowiada przez `/internal/guilds`.
3. Web pyta bot API o status i konfiguracje paneli.
4. Na stronie `/dashboard/:guildId` użytkownik edytuje ustawienia modułów.
5. Zapis idzie do `/api/modules/:guildId`, a dalej do bota (`/internal/panels/:guildId`).

## Konfiguracja web (root)

`.env` (na podstawie `.env.example`):

- `PORT` — port web+api
- `BOT_API_URL` — URL do bota (np. `http://localhost:4100` lub inny host)
- `BOT_STATUS_PATH` — status bota
- `BOT_GUILDS_PATH` — lista guild
- `BOT_PANELS_PATH` — endpoint konfiguracji paneli
- `SHARED_API_SECRET` — wspólny sekret web ↔ bot

## Konfiguracja bota (`bot/.env`)

- `BOT_TOKEN` — token bota z Discord Developer Portal
- `BOT_CLIENT_ID` — application client ID
- `BOT_API_PORT` — port API bota (domyślnie 4100)
- `BOT_HOST` — host bota (domyślnie 0.0.0.0)
- `SHARED_API_SECRET` — taki sam jak w web
- `PANEL_DATA_FILE` — ścieżka do JSON z konfiguracją
- `GUILDS_DATA_FILE` — ścieżka do JSON z guildami
- `WEB_BASE_URL` — URL panelu (używany przez komendę `/panel-link`)

## Uruchomienie

### 1) Web
```bash
npm install
cp .env.example .env
npm run dev
```

### 2) Bot (osobny folder)
```bash
cd bot
npm install
cp .env.example .env
npm run dev
```

## Najważniejsze endpointy

### Web API
- `GET /api/status`
- `GET /api/guilds`
- `GET /api/modules/:guildId`
- `PUT /api/modules/:guildId`

### Bot Internal API
- `GET /internal/status`
- `GET /internal/guilds`
- `GET /internal/panels/:guildId`
- `PUT /internal/panels/:guildId`

## Komenda bota
- `/panel-link` — zwraca link do dashboardu danego serwera.

