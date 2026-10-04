# DLo Live Tracker

Chrome extension for live fantasy football and sports bet tracking overlays.

Current version: **0.5.59 — BET-ID Ticket Parser**. The extension source was imported from `DLo-Live-Tracker-v0.5.59-BET-ID-Ticket-Parser.zip`.

## Install in Chrome

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder: `/Users/efagone/repositories/dlo-live-tracker`.
5. Pin **DLo Live Tracker** using Chrome's extensions menu.

No build or dependency installation is required. After changing extension files, click **Reload** on its card in `chrome://extensions`, then refresh any pages using the tracker.

## Use

- **Bets:** Open FanDuel **My Bets → Open**, select and copy the page text (Command+A, Command+C on macOS), then open the extension and click **Sync Bets**.
- **Fantasy:** Open your ESPN FantasyCast or Sleeper matchup, then open the extension and click **Sync Fantasy**.
- Use the popup's Bets and Fantasy tabs to adjust display and alert settings.

## Files

- `manifest.json`: Chrome extension configuration and permissions.
- `background.js`: Background service worker.
- `popup.html`, `bet-popup.js`, `live-popup.js`, `popup.css`: Extension popup.
- `parser.js`: Bet ticket parsing.
- `bet-content.*`, `fanduel-content.js`: On-page bet tracking.
- `fantasy-runtime.js`, `fantasy-content.css`: Fantasy tracking.
- `global-overlay.*`, `app-theme.css`: Shared overlays and styling.
- `icons/`: Extension icons.
- `privacy.html`: Privacy policy.
