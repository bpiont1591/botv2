# NebulaPulse — Landing + Panel API dla bota Discord

Gotowy projekt nowoczesnej strony (landing) + prostego backendu API przygotowanego pod scenariusz, gdzie **bot działa na osobnym hoście**.

## Nazwa projektu
**NebulaPulse**

## Co dostajesz
- responsywny landing page (ciemny, nowoczesny styl)
- sekcje: hero, funkcje, moduły, premium, FAQ, CTA, footer
- status usług pobierany z backendu
- backend `Express` z endpointem `/api/status`, który może czytać stan z osobnego hosta bota
- gotowe pliki konfiguracyjne `.env.example`

## Struktura

- `index.html` — główna strona
- `assets/styles.css` — style
- `assets/app.js` — logika frontendu (toast, FAQ, status)
- `api/server.js` — backend API
- `package.json` — skrypty i zależności
- `.env.example` — konfiguracja hostów

## Wymagania
- Node.js 18+

## Uruchomienie

```bash
npm install
cp .env.example .env
npm run dev
```

Domyślnie:
- landing: `http://localhost:3000`
- API status: `http://localhost:3000/api/status`

## Najważniejsze ENV

- `PORT` — port aplikacji
- `BOT_API_URL` — URL hosta bota (np. `https://bot.twojadomena.pl`)
- `BOT_STATUS_PATH` — endpoint statusu po stronie bota (np. `/internal/status`)

## Integracja z botem na osobnym hoście

Backend NebulaPulse:
1. pyta bota pod `BOT_API_URL + BOT_STATUS_PATH`
2. normalizuje odpowiedź do formatu frontendu
3. fallbackuje do `down` przy braku połączenia

Dzięki temu frontend nie musi łączyć się bezpośrednio z hostem bota.

## Przykładowy format odpowiedzi oczekiwany od hosta bota

```json
{
  "overall": { "state": "ok", "percent": 100 },
  "updatedAt": "2026-03-14T12:00:00.000Z"
}
```

Dozwolone `state`: `ok`, `degraded`, `down`

## Produkcja

```bash
npm run start
```

Możesz postawić aplikację jako jeden serwis web+api (Node) i trzymać bota osobno.
