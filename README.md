# NebulaPulse — Landing + Panel API + Discord Bot (osobny folder)

Gotowy projekt, gdzie:
- **Frontend** hostujesz np. na Cloudflare Pages (`botv2.pages.dev`)
- **Web API (Node/Express)** działa jako osobna usługa
- **Bot Discord** działa w osobnym folderze `bot/` i może być na osobnym hoście
- klient po dodaniu bota na serwer może wejść na `.../dashboard/:guildId` i edytować moduły panelu

## Struktura

- `index.html` — landing + widok edytora dashboardu
- `assets/styles.css` — style
- `assets/app.js` — status + edytor modułów dashboardu + `API_BASE_URL`
- `api/server.js` — API webowe (`/api/status`, `/api/guilds`, `/api/modules/:guildId`)
- `bot/index.js` — bot Discord + wewnętrzne API (`/internal/*`)
- `data/panels.json` — zapis konfiguracji modułów
- `data/guilds.json` — snapshot serwerów, na których jest bot
- `_redirects` — fallback dla `/dashboard/*` na Cloudflare Pages

## Jak to działa (osobne hosty)

1. Użytkownik dodaje bota na serwer Discord.
2. Bot synchronizuje listę guild do `data/guilds.json` i odpowiada przez `/internal/guilds`.
3. Web API pyta bot API o status i konfiguracje paneli.
4. Frontend na `botv2.pages.dev` pyta Web API przez CORS.
5. Na stronie `/dashboard/:guildId` użytkownik edytuje ustawienia modułów.
6. Zapis idzie do `/api/modules/:guildId`, a dalej do bota (`/internal/panels/:guildId`).

---

## Production-ready pod `botv2.pages.dev`

### 1) Frontend (Cloudflare Pages)

W `index.html` ustaw:

```html
<meta name="api-base-url" content="https://API_TWOJEJ_USLUGI.pl" />
```

Przykład:

```html
<meta name="api-base-url" content="https://api.botv2.pl" />
```

> Gdy meta jest pusta, frontend używa lokalnego fallbacku (dev/same-origin).

### 2) Web API (Express) — `.env`

```env
PORT=3000
BOT_API_URL=https://BOT_HOST.twojadomena.pl
BOT_STATUS_PATH=/internal/status
BOT_GUILDS_PATH=/internal/guilds
BOT_PANELS_PATH=/internal/panels
SHARED_API_SECRET=super-mocny-sekret
CORS_ORIGIN=https://botv2.pages.dev
```

### 3) Bot (`bot/.env`)

```env
BOT_TOKEN=...
BOT_CLIENT_ID=...
BOT_API_PORT=4100
BOT_HOST=0.0.0.0
SHARED_API_SECRET=super-mocny-sekret
PANEL_DATA_FILE=../data/panels.json
GUILDS_DATA_FILE=../data/guilds.json
WEB_BASE_URL=https://botv2.pages.dev
```

`WEB_BASE_URL` sprawia, że komenda `/panel-link` zwraca poprawny URL dashboardu.

### 4) CORS

Web API już ma CORS oparty o `CORS_ORIGIN` (domyślnie `https://botv2.pages.dev`).

### 5) Routing dashboardu na Pages

Plik `_redirects` zapewnia działanie linków typu:

- `/dashboard/123456789012345678`

bez błędu 404.

---

## Konfiguracja dev / lokalnie

### Web (root)
```bash
npm install
cp .env.example .env
npm run dev
```

### Bot (osobny folder)
```bash
cd bot
npm install
cp .env.example .env
npm run dev
```

W dev możesz zostawić `<meta name="api-base-url" content="" />`, wtedy frontend woła lokalne `/api/*`.

---

## Endpointy

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
