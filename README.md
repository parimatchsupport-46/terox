<p align="center"><img src="user-panel/assets/logo.png" width="84" height="84" alt="Terox Chat logo" /></p>

# Terox Chat

A mobile-only chat app: all users in one list, one-on-one threads, and tap-a-message
actions (reply / copy / edit / delete). Plain HTML, CSS and JS — no build step, no
framework, no backend. State lives in `localStorage`.

## Two folders

```
user-panel/    the chat app        (index / chat / profile / user + assets + data)
admin-panel/   the roster manager  (index + assets + data)
```

Each folder is **self-contained** — it carries its own `assets/` and `data/`, and no file
in either one reaches outside with `../`. That is what lets you deploy or serve a panel on
its own, and it is why the three runtime files both panels need (`ui.css`, `ui.js`,
`store.js`) exist as byte-identical copies. The test suite fails if the two copies ever
drift apart.

## Run

```bash
python3 -m http.server 5173
#   http://localhost:5173/user-panel/     the chat app
#   http://localhost:5173/admin-panel/    the admin panel
```

Live copy: <https://parimatchsupport-46.github.io/terox/> (redirects to the user panel);
admin at <https://parimatchsupport-46.github.io/terox/admin-panel/>.
Open the pages **through a server, never through a `raw.` link or a file preview pane**:
the screens are plain HTML + linked CSS + linked JS, and `raw.githubusercontent.com`
serves `.css` as `text/plain` with `nosniff`, so the browser refuses to apply it and
you get an unstyled page. The admin panel checks for that and prints a banner naming
the file that failed instead of going silent. Avatars are gitignored, so the hosted
copy shows initials + tint until the images are committed.

## Admin panel

`admin-panel/index.html`. On a desktop it is a real two-column layout — the roster on the
left, a 408px create/edit column on the right that stays in view while the list scrolls,
content capped at 1240px and centred. Below 940px it collapses to one column and the form
becomes a bottom sheet. Pinch zoom stays on here (unlike the chat screens) and every
control keeps a 44px touch target.

The bar carries its own mark — the desk-and-gear artwork — while the chat app keeps the
blue bubble, and each folder ships `logo.png` plus 32/64 px variants of its own art.

- A user is created from **name, username, bio**, and the admin **uploads the profile
  image as a file** — there is no URL field anywhere. The file is dropped on the panel,
  centre-cropped to a 360px square, re-encoded at ~15 KB and kept on that user's own
  record, so the picture travels inside `data/users.json` wherever the roster goes.
  JPG, PNG and WebP only, 8 MB cap, anything else is refused with a reason.
- If the admin does not upload, `assets/avatars/` still works as a pool
  (`data/avatars.json` is the manifest): each new user takes the first image nobody has
  yet, so one image belongs to exactly one user, and deleting a user returns theirs.
- Create, edit, delete (with Undo), search, and Export / Import of
  `data/users.json` for shipping the roster.
- The panel writes to the same store the chat reads (`terox.users.v1`), so a created user
  appears on the home list in that browser immediately. **View** on a row opens that
  user's profile in the user panel — on the Pages site that is the sibling folder; when
  the panel is deployed on its own, set `window.TEROX_APP_BASE` to the user panel's URL.
- The 35-face pool in `assets/avatars/` is committed, so a fresh clone and the Pages site
  show the same faces as this machine; only the initials fallback needs no file at all.

## No backend — and that is the whole design

No server, no Firebase, no database: nothing in either folder talks to another host, and the
suite fails the build if a URL to one appears or a browser run makes an off-origin request.

| What | Where it lives |
| --- | --- |
| The roster both panels show | `data/users.json` in each folder — the shipped list the admin panel edits and exports |
| Live sharing on one site | `localStorage` key `terox.users.v1`. Both panels run on the same origin, so a user created in the panel is on the chat home page the next time it paints |
| Sign-in | `terox.accounts.v1` (the accounts registered on this device) + `terox.session.v1` (who is signed in) |
| Profile images | the uploaded file is centre-cropped to a 360px JPEG (~15 KB) and kept on the user's own record, so it travels inside `users.json` |
| Chats, prefs, theme | `terox.chats.v1`, `terox.prefs.v1`, `theme` |

**Getting the roster onto another device:** edit in the panel → *Export users.json* → commit
it as `data/users.json` in both folders (Import reads it back, *Reset to shipped list* returns
to whatever is committed). That file is the sync mechanism — deliberately, since there is no
service behind it.

## Signing in (user panel only)

`user-panel/login.html` is the front door: every screen calls `Auth.gate()` before it paints,
and with no session it hands you straight to that page.

- **Sign in** = the mobile number. **Create account** = name + mobile number. That is the whole
  form — there is no password, no OTP, no email. The number is the key, so it is unique per
  device and a second account on the same device can be switched to from the list on the gate.
- **Auto-login:** the session is the account id in `localStorage`, so opening the app again
  skips the gate. **Profile → Account → Log out** clears it (and any other browser on the same
  number needs its own sign-in — there is nothing shared to fall back on).
- Numbers are validated as 10-digit Indian mobiles (`6-9` first). `+91` is shown, not typed.
- The account name becomes the profile the app shows you (`Store.profile()`), so the drawer,
  the chat bubbles and the profile screen all read the name you registered.
- The home list itself is **not** per account: every signed-in user sees the same roster, which
  is the list the admin panel maintains.

Say the word if you want a PIN on that number — the field and the check are ten lines, but a
number-only login means anyone holding the phone signs in as you.

## Vercel

Two static sites, no build command, no install command — and because neither folder uses
`../`, each one can be its own project:

| Project | Root Directory | Output |
| --- | --- | --- |
| admin | `admin-panel` | `https://terox-admin-8740.vercel.app/` |
| app | `user-panel` | `https://<app>.vercel.app/` |

If you would rather have one project, set Root Directory to the repository root and use
`/admin-panel/` and `/user-panel/` as the paths — each folder has a `vercel.json` with
cache headers, and the repo root has a plain redirect to the user panel. Nothing to configure after a deploy: no env vars, no secret, no project id — the panels
share data through the committed `data/users.json` and the browser's own storage.

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
Red stays reserved for destructive actions. The app's mark is `#1e90ff` too, so artwork and UI
read as one colour; the admin panel carries its own illustration, shown at its real 512px detail
and never cropped to a circle.

Used: app bar + theme toggle · cards · buttons (yes/no) · badges · search bar ·
toggle switch · loader dots (typing) · toast.
Not used: tables, modals, stepper, the library's uploader widget, footer — the panel takes a
plain file input and crops it on a canvas instead.

## Files

```
user-panel/login.html            the gate: name + mobile, or just the mobile number
user-panel/index.html            home: the roster (search, live dot, photo)
user-panel/chat.html             one thread: bubbles, reply/edit/copy/delete modal
user-panel/profile.html          my profile: prefs, theme, data controls
user-panel/user.html?u=<id>      read-only profile of any user
user-panel/assets/ui.css         the design system (both folders carry the same copy)
user-panel/assets/app.css        the four chat screens
user-panel/assets/ui.js          theme, drawer, toasts, zoom lock, avatar markup
user-panel/assets/store.js       the roster + chats + prefs, all on-device
user-panel/assets/auth.js        the account gate: register, sign in, auto-login
user-panel/assets/login.js       that screen's form
user-panel/assets/{home,chat,profile,user}.js
user-panel/assets/avatars/       the image pool — 35 squares, committed
user-panel/data/{users,avatars}.json

admin-panel/index.html           one screen: roster, form, dialogs
admin-panel/assets/admin.css     the panel layout (desktop two-column, phone sheet)
admin-panel/assets/admin.js      form, validation, pool rule, upload, export/import
admin-panel/assets/{ui.css,ui.js,store.js}   the same three copies as the user panel
admin-panel/assets/avatars/      its own copy of the pool — gitignored
admin-panel/data/{users,avatars}.json

index.html                       redirect to the user panel
*/vercel.json                    cache headers for a static deploy
```

`assets/auth.js` is only in the user panel: the admin panel has its own gate of a different
kind — it is a folder you deploy where you are, not something a visitor can open.

The suite that checks all of this lives outside the repo (`../test-harness`), so the app
folders stay lean: no tests, no fixtures, no build config.
