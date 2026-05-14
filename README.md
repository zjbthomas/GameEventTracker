# Game Event Tracker

A lightweight productivity tool for players who want to stay on top of limited-time game events, daily/weekly tasks, and personal reminders.

## Overview

Game Event Tracker is a browser-based tracker that helps you:

- Organize game events on a calendar.
- Add progress/completion goals per event.
- Keep a dedicated to-do list with due dates and notes.
- Import/export data as JSON backups.

The project is structured as a Chrome Extension-style app, but it can also be hosted statically for quick access.

## Features

- **Interactive monthly calendar** with next/previous/today navigation.
- **Event management** with:
  - game name and title,
  - start/end date,
  - optional reminder date,
  - custom color,
  - completion slots (day/week/month/total),
  - notes.
- **Drag-and-drop support** for moving events between days.
- **To-do panel** with due dates, notes, completion state, and undo actions.
- **Undo bars** for event/task deletions.
- **Data portability** via export/import buttons.

## Project Structure

- `tracker.html` — main tracker interface.
- `tracker.css` — tracker UI styles.
- `tracker.js` — tracker logic.
- `popup.html`, `popup.css`, `popup.js` — extension popup UI.
- `background.js`, `steam-content.js`, `steam-content.css` — extension/background/content scripts.
- `manifest.json` — extension manifest.
- `docs/` — GitHub Pages landing site.

## Chrome Extension Load (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository root folder.