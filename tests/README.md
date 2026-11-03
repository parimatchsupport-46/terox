# Checks

Two harnesses, both pointing at a static server on port 5173.

```bash
cd tests
npm install                     # jsdom + playwright
npx playwright install chromium  # + system libs; see note below
npm run serve                    # in another shell
node smoke.js                    # behaviour suite (no browser needed)
node visual.js                   # layout/visual suite (needs chromium)
```

- `smoke.js` — runs all three pages in jsdom and asserts on rendered DOM +
  localStorage: counters, search filter, thread switching, send → typing dots →
  auto-reply, unread clearing, profile inline edit + validation, toggles, theme.
- `visual.js` — real Chromium at 1280×860 and 390×844 in light and dark. Fails on
  console errors, horizontal overflow, clipped text, wrong navbar height (64px),
  radius != 6px, missing card shadow, hamburger visibility, chat frame exceeding
  the viewport, and drives the theme toggle / mobile list↔thread / send / save flows.
  (The chat frame is deliberately full-bleed under 760px, so radius/shadow are
  exempt there.)

If chromium can't start for missing shared libraries on a sandbox:
`apt-get download libnspr4 libnss3 libatk1.0-0t64 ...`, `dpkg -x` them into a local
dir and run with `LD_LIBRARY_PATH=<dir>/usr/lib/x86_64-linux-gnu`.
