/* Visual + layout pass in real Chromium: console errors, overflow, screenshots. */
const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:5173";
const OUT = __dirname + "/shots";
require("fs").mkdirSync(OUT, { recursive: true });

const PAGES = ["index.html", "chat.html", "profile.html"];
let problems = [];

(async () => {
  const browser = await chromium.launch();

  for (const view of [
    { name: "desktop", width: 1280, height: 860 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    for (const theme of ["light", "dark"]) {
      const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height } });
      await ctx.addInitScript(([t]) => {
        try { localStorage.setItem("theme", t); localStorage.setItem("simpleui.chat.v1", ""); } catch (e) {}
      }, [theme]);

      for (const file of PAGES) {
        const page = await ctx.newPage();
        const errs = [];
        page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
        page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
        await page.goto(`${BASE}/${file}`, { waitUntil: "load" });
        await page.waitForTimeout(700);

        const shot = `${OUT}/${view.name}-${file.replace(".html", "")}-${theme}.png`;
        await page.screenshot({ path: shot, fullPage: file === "index.html" || file === "profile.html" });

        const report = await page.evaluate(() => {
          const de = document.documentElement;
          const overflowX = de.scrollWidth - de.clientWidth;
          let clipped = [];
          document.querySelectorAll(".card, .btn, .bubble, .conv, .row, .list-item, .stat").forEach((el) => {
            if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) clipped.push(el.className + " :: " + (el.textContent || "").trim().slice(0, 34));
          });
          const cs = getComputedStyle(document.body);
          const navbar = document.querySelector(".navbar");
          const themeToggle = document.getElementById("themeToggle");
          const visible = (el) => el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
          return {
            overflowX,
            clipped: clipped.slice(0, 6),
            font: cs.fontFamily.split(",")[0],
            bg: cs.backgroundColor,
            navH: navbar ? Math.round(navbar.getBoundingClientRect().height) : 0,
            menuBtnVisible: visible(document.getElementById("menuBtn")),
            navLinksVisible: visible(document.querySelector(".nav-links")),
            toggleIcon: themeToggle ? themeToggle.querySelectorAll("svg").length : 0,
            radius: (() => { const c = document.querySelector(".card, .chat-frame"); return c ? getComputedStyle(c).borderRadius : "n/a"; })(),
            shadow: (() => { const c = document.querySelector(".card, .chat-frame"); return c ? getComputedStyle(c).boxShadow !== "none" : true; })(),
            chatFrame: (() => {
              const f = document.getElementById("chatFrame");
              if (!f) return null;
              const r = f.getBoundingClientRect();
              return { h: Math.round(r.height), w: Math.round(r.width), bottom: Math.round(r.bottom), vh: window.innerHeight };
            })(),
          };
        });

        const tag = `${view.name}/${theme}/${file}`;
        if (errs.length) problems.push(`${tag}: console errors ${JSON.stringify(errs.slice(0, 3))}`);
        if (report.overflowX > 0) problems.push(`${tag}: horizontal overflow ${report.overflowX}px`);
        if (report.clipped.length) problems.push(`${tag}: clipped content -> ${JSON.stringify(report.clipped)}`);
        if (report.font !== "system-ui") problems.push(`${tag}: unexpected font ${report.font}`);
        if (report.navH < 64 || report.navH > 65) problems.push(`${tag}: navbar height ${report.navH}`);
        /* the chat frame goes full-bleed under 760px on purpose (no radius/shadow) */
        const fullBleedChat = file === "chat.html" && view.name === "mobile";
        if (!fullBleedChat) {
          if (report.radius !== "6px" && report.radius !== "n/a") problems.push(`${tag}: card radius ${report.radius} (library uses 6px)`);
          if (!report.shadow) problems.push(`${tag}: card has no shadow`);
        }
        if (view.name === "mobile" && !report.menuBtnVisible) problems.push(`${tag}: hamburger not shown on mobile`);
        if (view.name === "desktop" && report.menuBtnVisible) problems.push(`${tag}: hamburger visible on desktop`);
        if (report.chatFrame && report.chatFrame.bottom > report.chatFrame.vh + 1)
          problems.push(`${tag}: chat frame overflows viewport (${report.chatFrame.bottom} > ${report.chatFrame.vh})`);

        console.log(tag, JSON.stringify({ bg: report.bg, nav: report.navH, radius: report.radius, chat: report.chatFrame, errs: errs.length }));
        await page.close();
      }
      await ctx.close();
    }
  }

  // interactions: theme toggle + mobile nav + chat send, in a real browser
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  await page.goto(`${BASE}/chat.html`);
  await page.waitForTimeout(400);
  const beforeTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  await page.click("#themeToggle");
  const afterTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (beforeTheme === afterTheme) problems.push("theme toggle did not flip data-theme");
  console.log("theme toggle:", beforeTheme, "->", afterTheme);

  await page.fill("#composerInput", "Real browser check 🚀");
  await page.press("#composerInput", "Enter");
  await page.waitForTimeout(2600);
  const bubbleCount = await page.locator("#messages .msg:not(#typingRow)").count();
  if (bubbleCount !== 6) problems.push(`chat: expected 6 bubbles after send in meera thread, got ${bubbleCount}`);
  console.log("send via Enter -> bubbles:", bubbleCount);
  await page.screenshot({ path: `${OUT}/desktop-chat-after-send.png` });

  // mobile conversation -> thread -> back
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await m.goto(`${BASE}/chat.html`);
  await m.waitForTimeout(400);
  const sideVisible = await m.locator(".chat-side").isVisible();
  const mainHidden = await m.locator(".chat-main").isHidden();
  if (!sideVisible || !mainHidden) problems.push("mobile: list/thread toggle wrong (list visible=" + sideVisible + ", main hidden=" + mainHidden + ")");
  await m.locator(".conv").first().click();
  await m.waitForTimeout(250);
  const threadVisible = await m.locator(".chat-main").isVisible();
  const listHidden = await m.locator(".chat-side").isHidden();
  if (!threadVisible || !listHidden) problems.push("mobile: tapping a chat did not show the thread");
  await m.screenshot({ path: `${OUT}/mobile-chat-thread.png` });
  await m.locator("#backBtn").click();
  await m.waitForTimeout(250);
  if (!(await m.locator(".chat-side").isVisible())) problems.push("mobile: back button did not return to list");

  // profile inline edit end-to-end
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await p.goto(`${BASE}/profile.html`);
  await p.waitForTimeout(300);
  const actionsHidden = await p.locator("#formActions").isHidden();
  if (!actionsHidden) problems.push("profile: save row visible while read-only");
  await p.click("#editBtn");
  await p.fill("#fName", "Asha Pillai");
  await p.click('#tintRow [data-tint="no"]');
  await p.locator("#profileForm button[type=submit]").click();
  await p.waitForTimeout(300);
  const head = await p.locator("#pName").textContent();
  const navAv = await p.locator(".nav-avatar").textContent();
  const tint = await p.locator("#avatarBig").getAttribute("class");
  if (head.trim() !== "Asha Pillai") problems.push("profile: header not updated (" + head + ")");
  if (navAv.trim() !== "AP") problems.push("profile: navbar avatar not updated (" + navAv + ")");
  if (!tint.includes("t-no")) problems.push("profile: tint not applied");
  await p.screenshot({ path: `${OUT}/desktop-profile-saved.png`, fullPage: true });

  // hidden attr + badges sanity on home
  await p.goto(`${BASE}/index.html`);
  await p.waitForTimeout(500);
  const countHidden = await p.locator(".nav-count").first().isVisible();
  console.log("nav count visible after all read:", countHidden, "(unread arrives from the auto-reply, so non-zero is correct)");

  console.log("\n" + (problems.length ? "PROBLEMS:\n- " + problems.join("\n- ") : "VISUAL PASS: no console errors, no overflow, no clipping, tokens match library"));
  await browser.close();
  process.exit(problems.length ? 1 : 0);
})();
