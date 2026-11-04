<p align="center"><img src="assets/logo.png" width="84" height="84" alt="Terox Chat logo" /></p>

# Terox Chat

A mobile-only chat app: all users in one list, one-on-one threads, and tap-a-message
actions (reply / copy / edit / delete). Plain HTML, CSS and JS — no build step, no
framework, no backend. State lives in `localStorage`.

## Run

```bash
python3 -m http.server 5173   # then open http://localhost:5173  (admin at /admin/)
```

Live copy: <https://parimatchsupport-46.github.io/terox/> — admin panel at
<https://parimatchsupport-46.github.io/terox/admin/>.

Open the pages **through a server, never through a `raw.` link or a file preview pane**:
the screens are plain HTML + linked CSS + linked JS, and `raw.githubusercontent.com`
serves `.css` as `text/plain` with `nosniff`, so the browser refuses to apply it and
you get an unstyled page. The admin panel checks for that and prints a banner naming
the file that failed instead of going silent. Avatars are gitignored, so the hosted
copy shows initials + tint until the images are committed.

## Admin panel

`admin/index.html` is where the roster is made. It is responsive — a two-column
roster + form on a desktop, a single column with the form as a bottom sheet on a
phone (pinch zoom stays on there, unlike the chat screens).

- A user is created from three fields: **name, username, bio**.
- **No photo URL and no upload field.** `assets/avatars/` holds the image pool
  (`data/avatars.json` is the manifest); each new user is auto-assigned the first
  image nobody has yet, so one image belongs to exactly one user. Delete a user and
  their image goes back into the pool. When the pool runs dry, later users keep the
  initials + tint.
- Create, edit, delete (with Undo), search, and Export / Import of
  `data/users.json` for shipping the roster.
- The panel writes to the same store the chat reads (`terox.users.v1`), so a created
  user appears on the home list in that browser immediately; the JSON file is what
  you commit so other devices get the same roster.

Open it at `/admin/` while the preview is running. The avatar images are people's
photos, so they are gitignored — `data/users.json` records which file each user owns.

## Screens

| Screen | File | What is on it |
| --- | --- | --- |
| Home | `index.html` | Every user in one list — all statuses online, last message preview, timestamp, unread count, search |
| Chat | `chat.html` | One thread: day separators, quoted replies, timestamps, typing dots, composer. `chat.html?u=meera` opens a specific chat |
| Profile | `profile.html` | Name, username, phone and status with inline edit, avatar colour, 3 chat settings, local data controls |
| View profile | `user.html?u=<id>` | Read-only profile of any user — pool photo, name, @username, bio, chat activity, Message button. Tapping a face on home or the header in a chat opens this |

Navigation between the screens is the menu button in the app bar (right side);
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
--brand #1e90ff · --accent #0b64c4 · --yes #0b64c4 · --no #e5484d
radius 6px · system-ui
dark: #12141a / #1c1f28 / #eceef3 · --accent #1e90ff with dark ink (#041426) on filled buttons
```

One blue theme (`#1E90FF`) in both modes. `#1e90ff` with white text is only 3.2:1, so light mode
deepens the accent to `#0b64c4` (white text 5.8:1) while dark mode fills with `#1e90ff` and a near-black
ink `#041426` (5.7:1). Every surface that used the accent — own bubbles, send button, toggles, badges,
avatar tints, focus rings, quote bar, jump flash, online label — derives from that same blue.
Red stays reserved for destructive actions. The logo mark itself is `#1e90ff` too, so artwork and
UI read as one colour.

Used: app bar + theme toggle · cards · buttons (yes/no) · badges · search bar ·
toggle switch · loader dots (typing) · toast.
Not used: tables, modals, stepper, file uploader, footer — nothing here needs them.

## Files

```
index.html  chat.html  profile.html
assets/logo.png      brand mark (app bar, drawer, favicon) + logo-32.png / logo-64.png
assets/avatars/    the photo pool (one file per user, never reused) — local only, gitignored
data/users.json    the roster the admin panel edits and exports
data/avatars.json  the ordered list of pool images
assets/ui.css      tokens + reused components
assets/app.css     the three screens
assets/store.js    localStorage data layer (users, chats, profile, prefs)
assets/ui.js       theme, drawer, toasts, zoom lock
assets/home.js  assets/chat.js  assets/profile.js
```
