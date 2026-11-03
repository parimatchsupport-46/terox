# Terox Chat

A mobile-only chat app: all users in one list, one-on-one threads, and tap-a-message
actions (reply / copy / edit / delete). Plain HTML, CSS and JS — no build step, no
framework, no backend. State lives in `localStorage`.

## Run

```bash
python3 -m http.server 5173   # then open http://localhost:5173
```

## Screens

| Screen | File | What is on it |
| --- | --- | --- |
| Home | `index.html` | Every user in one list — all statuses online, last message preview, timestamp, unread count, search |
| Chat | `chat.html` | One thread: day separators, quoted replies, timestamps, typing dots, composer. `chat.html?u=meera` opens a specific chat |
| Profile | `profile.html` | Name, username, phone and status with inline edit, avatar colour, 3 chat settings, local data controls |

Navigation between the three screens is the menu button in the app bar (right side);
the panel slides in from the **left**.

Message actions: tap any bubble → sheet with **Reply**, **Copy**, **Edit**, **Delete**,
plus that message's text, date and time in the sheet header. Delete offers Undo.
Replying puts a quote inside your bubble; tapping the quote scrolls to the original.

## Mobile only

- `viewport` is locked: `width=device-width, initial-scale=1, maximum-scale=1,
  user-scalable=no` and pinch/double-tap zoom is blocked in `assets/ui.js` +
  `touch-action` in `assets/ui.css`, so no page can zoom.
- Every input/textarea is `16px` — below that iOS auto-zooms on focus.
- Layout is a 480px column: full-bleed on phones, centred on larger screens.
- Safe-area padding on the app bar, composer and toasts for notched devices.
- 44px minimum touch targets, `:active` feedback instead of hover, `enterkeyhint`
  on the composer.

## Design

Tokens and components come from the [`simple-ui`](https://github.com/parimatchsupport-46/simple-ui)
library, and only the pieces this app needs are used:

```
--bg #f4f5f7 · --card #ffffff · --text #1f2430 · --muted #6b7280 · --border #e5e7eb
--accent #4f6bed · --yes #22a06b · --no #e5484d · shadow 0 8px 30px rgba(0,0,0,.08)
radius 6px · system-ui · dark: #12141a / #1c1f28 / #eceef3 / #7b92ff
```

Used: app bar + theme toggle · cards · buttons (yes/no) · badges · search bar ·
toggle switch · loader dots (typing) · toast.
Not used: tables, modals, stepper, file uploader, footer — nothing here needs them.

## Files

```
index.html  chat.html  profile.html
assets/ui.css      tokens + reused components
assets/app.css     the three screens
assets/store.js    localStorage data layer (users, chats, profile, prefs)
assets/ui.js       theme, drawer, toasts, zoom lock
assets/home.js  assets/chat.js  assets/profile.js
```
