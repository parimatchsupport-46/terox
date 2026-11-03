# Chatter — 3-page UI on the `simple-ui` design system

Home · Chat · Profile, built as plain HTML/CSS/JS (no build step), using the
design language of [`simple-ui`](https://github.com/parimatchsupport-46/simple-ui)
as the reference — and only the components this app actually needs.

## Run it

```bash
cd simple-chat-ui
./preview.sh                    # or: python3 -m http.server 5173 / npx serve .
# open http://localhost:5173
```

`preview.sh` is idempotent — it reuses a server that is already up and otherwise
starts one on `$PORT` (default 5173). If you are viewing this in the Arena agent
sandbox: background processes do not survive between turns, so a blank preview
panel just means the server stopped — re-run `./preview.sh`. All state is local
`localStorage`, so a fresh server never loses your data.

Any static server works; `index.html` also opens straight from disk.

## Deploy

Every asset link in this repo is relative, so it needs no build step and no base-path
config:

- **GitHub Pages** → Settings ▸ Pages  Source: *Deploy from a branch* ▸ `main` /
  `/(root)`. Done — `index.html`, `chat.html` and `profile.html` all work.
- **Netlify / Vercel / Cloudflare Pages** → build command: *(none)*, publish
  directory: repository root.
- **Any static host / S3 / nginx** → upload the repo root as-is.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | Hero + mini thread preview, live counters from the shared store, recent conversations, token/component audit, footer |
| Chat | `chat.html` | Filterable conversation list, message thread with day separators, composer with emoji row, typing indicator and simulated replies. Deep-linkable: `chat.html?c=meera` |
| Profile | `profile.html` | Identity card with completeness meter, inline editing (no modal), avatar tint picker, 6 preference toggles, theme control, account panel |

State lives in `localStorage` (`simpleui.chat.v1`, `simpleui.profile.v1`,
`simpleui.prefs.v1`) so the three pages stay in sync — editing your name on
Profile changes the navbar avatar on every page. "Reset demo data" in the
footer clears it.

## Files

```
index.html  chat.html  profile.html
assets/ui.css      design tokens + the reused simple-ui components (library layer)
assets/pages.css   layout for the three pages only
assets/store.js    localStorage data layer shared by all pages
assets/ui.js       theme toggle, mobile nav, toasts, navbar hydration
assets/home.js  assets/chat.js  assets/profile.js
tests/            jsdom behaviour suite + chromium visual/layout suite (see tests/README.md)
```

## Checks run

```bash
node tests/smoke.js    # 80 behaviour assertions across the 3 pages
node tests/visual.js   # 12 page × theme × viewport combos: no console errors,
                       # no overflow, no clipped text, tokens verified
```

## Design tokens — copied, not reinvented

```
--bg #f4f5f7   --card #ffffff   --text #1f2430   --muted #6b7280
--border #e5e7eb   --accent #4f6bed   --yes #22a06b   --no #e5484d
--shadow 0 8px 30px rgba(0,0,0,.08)   radius 6px   font system-ui
dark overrides: bg #12141a · card #1c1f28 · text #eceef3 · accent #7b92ff
```

Same 64px sticky navbar, 960px content width, `localStorage["theme"]` +
`prefers-color-scheme` contract as the library.

## Component reuse — 9 used, 4 skipped

**Used:** Cards & buttons (all pages) · Navbar (all pages) · Badges (unread
counts, statuses, role tags) · Search bar (chat filter) · Toggle switch
(profile preferences) · Loader dots (chat typing indicator) · Tooltips
(composer actions) · Footer (home) · Toast/alert (save + chat feedback).

**Skipped on purpose:** Tables (no tabular data), Modals (profile edits inline),
Stepper (single-step forms), File uploader (attachments out of scope).
