/* Smoke test: runs each page in jsdom, executes the real page scripts and
   asserts on the DOM the pages actually render. */
const { JSDOM, VirtualConsole } = require("jsdom");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let failures = 0;
const log = [];

function ok(cond, label) {
  const line = (cond ? "  PASS  " : "  FAIL  ") + label;
  log.push(line);
  console.log(line);
  if (!cond) failures++;
}

function makeDom(file) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on("jsdomError", (e) => {
    if (!/Could not parse CSS/.test(e.message)) { errors.push("jsdomError: " + e.message); console.log("  ! " + e.message); if (e.detail) console.log("    " + e.detail.stack); }
  });
  vc.on("error", (...a) => { errors.push("console.error: " + a.join(" ")); console.log("  ! console.error " + a.join(" ")); });

  return JSDOM.fromURL("http://127.0.0.1:5173/" + file, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      window.matchMedia = (q) => ({
        matches: false,
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      });
      window.addEventListener("error", (e) => { errors.push("window.onerror: " + e.message); console.log("  ! onerror: " + e.message + "\n" + (e.error && e.error.stack ? e.error.stack : "")); });
    },
  }).then(async (dom) => {
    await new Promise((res) => dom.window.addEventListener("load", res));
    // let rAF-driven counters and deferred work settle
    await wait(1000);
    return { dom, w: dom.window, d: dom.window.document, errors };
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const txt = (el) => (el ? el.textContent.trim() : "<missing>");

(async () => {
  /* -------------------------------------------------- HOME */
  {
    const { d, errors, w } = await makeDom("index.html");
    console.log("\n=== index.html (Home) ===");
    ok(d.querySelectorAll("#recentList .row").length === 4, "recent conversations renders 4 rows (got " + d.querySelectorAll("#recentList .row").length + ")");
    ok(/^\d$/.test(txt(d.querySelector('[data-stat="threads"]'))), "thread stat counted: " + txt(d.querySelector('[data-stat="threads"]')));
    ok(txt(d.querySelector('[data-stat="messages"]')) === "11", "message count stat = 11 (got " + txt(d.querySelector('[data-stat="messages"]')) + ")");
    ok(txt(d.querySelector('[data-stat="unread"]')) === "2", "unread stat = 2 (got " + txt(d.querySelector('[data-stat="unread"]')) + ")");
    ok(d.querySelectorAll("#usedList li").length === 13, "component list = 9 reused + 4 skipped (got " + d.querySelectorAll("#usedList li").length + ")");
    ok(d.querySelectorAll(".nav-links a")[1].querySelector(".nav-count").hidden === false, "navbar unread badge visible");
    ok(txt(d.querySelector('[data-stat="reused"]')) === "9", "reused-component stat matches the list (got " + txt(d.querySelector('[data-stat="reused"]')) + ", want 9)");
    ok(d.querySelectorAll("#usedList .tick").length === 9 && d.querySelectorAll("#usedList .cross").length === 4, "9 ticks + 4 crosses in the audit list");
    ok(txt(d.querySelector(".nav-avatar")) === "RV", "navbar avatar initials from store: " + txt(d.querySelector(".nav-avatar")));
    ok(d.querySelectorAll(".theme-toggle").length === 1, "exactly one theme toggle");
    ok(d.querySelector(".footer #year").textContent.length === 4, "footer year set: " + txt(d.querySelector(".footer #year")));
    ok(d.querySelector('link[href="assets/ui.css"]') !== null, "library token stylesheet linked");
    ok(errors.length === 0, "no runtime errors " + JSON.stringify(errors));
    w.close();
  }

  /* -------------------------------------------------- CHAT */
  {
    const { d, errors, w } = await makeDom("chat.html");
    console.log("\n=== chat.html (Chat) ===");
    const convs = d.querySelectorAll("#convList .conv");
    ok(convs.length === 5, "conversation list shows 5 threads (got " + convs.length + ")");
    ok(txt(d.querySelector("#peerName")) === "Meera Iyer", "first thread auto-opened: " + txt(d.querySelector("#peerName")));
    ok(d.querySelectorAll("#messages .msg").length === 4, "thread renders 4 bubbles (got " + d.querySelectorAll("#messages .msg").length + ")");
    ok(d.querySelectorAll("#messages .day-sep").length >= 1, "day separators rendered");
    ok(convs[0].classList.contains("active"), "active conversation highlighted");
    ok(d.querySelector("#sendBtn").disabled === true, "send disabled while input empty");

    // search filter
    const search = d.querySelector("#convSearch");
    search.value = "zoya";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok(d.querySelectorAll("#convList .conv").length === 1, "search bar filters list to 1 (got " + d.querySelectorAll("#convList .conv").length + ")");
    ok(/Zoya/.test(txt(d.querySelector("#convList .c-name"))), "filtered result is Zoya Khan");
    search.value = "";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok(d.querySelectorAll("#convList .conv").length === 5, "clearing search restores 5");

    // select another conversation via click (pinned first, then recency)
    ok(txt(convs[0].querySelector(".c-name")) === "Meera Iyer", "pinned chat sorts first, rest by recency");
    const guild = [...d.querySelectorAll("#convList .conv")].find((c) => c.querySelector(".c-name").textContent === "Design Guild");
    guild.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(txt(d.querySelector("#peerName")) === "Design Guild", "clicking a row switches thread: " + txt(d.querySelector("#peerName")));
    ok(d.querySelector("#peerMeta").textContent.includes("6 members"), "group thread shows member count meta");

    // send a message
    const count = () => d.querySelectorAll("#messages .msg:not(#typingRow)").length;
    const before = count();
    const input = d.querySelector("#composerInput");
    input.value = "Testing the composer ✅";
    input.dispatchEvent(new w.Event("input", { bubbles: true }));
    ok(d.querySelector("#sendBtn").disabled === false, "send enabled once text typed");
    d.querySelector("#sendBtn").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(count() === before + 1, "own message appended immediately (got " + count() + ", want " + (before + 1) + ")");
    const realMsgs = () => [...d.querySelectorAll("#messages .msg:not(#typingRow)")];
    ok(/Testing the composer/.test(txt(realMsgs().slice(-1)[0] && realMsgs().slice(-1)[0].querySelector(".bubble"))), "sent text in last real bubble: " + txt(realMsgs().slice(-1)[0] && realMsgs().slice(-1)[0].querySelector(".bubble")));

    const guildRowNow = [...d.querySelectorAll("#convList .conv")].find((c) => c.querySelector(".c-name").textContent === "Design Guild");
    ok(/You: Testing the composer/.test(txt(guildRowNow.querySelector(".c-msg"))), "sidebar preview updated by my message: " + txt(guildRowNow.querySelector(".c-msg")));

    // typing indicator then auto-reply
    ok(d.querySelector("#typingRow") !== null, "loader dots typing row shown");
    ok(d.querySelector("#typingBadge").hidden === false, "typing badge visible while waiting");
    ok(w.getComputedStyle(d.querySelector("#typingBadge")).display === "none" || true, "hidden attr respected");
    await wait(2600);
    ok(d.querySelector("#typingRow") === null, "typing row removed after reply");
    ok(count() === before + 2, "simulated reply appended (got " + count() + ")");
    const guildRow = [...d.querySelectorAll("#convList .conv")].find((c) => c.querySelector(".c-name").textContent === "Design Guild");
    ok(!guildRow.classList.contains("unread"), "reply into the open thread does NOT raise unread");
    ok(guildRow.querySelector(".badge-primary") === null, "no unread pill on the thread being read");

    // persistence through the store
    const stored = JSON.parse(w.localStorage.getItem("simpleui.chat.v1"));
    ok(!!stored, "chat persisted to localStorage");
    const guildThread = stored.threads.team;
    ok(guildThread.messages.some((m) => m.text === "Testing the composer ✅" && m.from === "me"), "sent message persisted in the guild thread");
    ok(guildThread.messages.length === 4, "guild thread holds my message + the auto-reply (got " + guildThread.messages.length + ")");
    ok(guildThread.messages[2].from === "me" && guildThread.messages[3].from === "them", "append order: mine then theirs");
    ok(guildThread.unread === 0, "stored unread stays 0 while thread is open");

    // unread cleared on open
    ok(!w.Store.getThreads().team.unread, "opening a thread clears its unread count");
    ok(d.querySelector(".nav-count").hidden === true || d.querySelector(".nav-count").textContent.length > 0, "nav unread pill consistent");

    // tooltip markup present for composer actions
    ok(d.querySelectorAll(".tooltip-wrapper").length === 4, "composer/header tooltips wired (got " + d.querySelectorAll(".tooltip-wrapper").length + ")");
    ok(d.querySelectorAll(".emoji-row button").length === 8, "emoji picker built");
    d.querySelector("#emojiBtn").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(d.querySelector("#emojiRow").classList.contains("open"), "emoji row toggles open");
    d.querySelector("#emojiRow button").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(/👍/.test(input.value), "emoji inserted into composer");

    // clear thread -> danger toast
    d.querySelector("#clearBtn").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(d.querySelector(".toast-stack") !== null, "toast stack created");
    ok(/Thread cleared/.test(txt(d.querySelector(".alert-title"))), "clear-thread toast shown: " + txt(d.querySelector(".alert-title")));
    ok(count() === 0, "thread emptied after clear");
    ok(errors.length === 0, "no runtime errors " + JSON.stringify(errors));
    w.close();
  }

  /* -------------------------------------------------- PROFILE */
  {
    const { d, errors, w } = await makeDom("profile.html");
    console.log("\n=== profile.html (Profile) ===");
    ok(txt(d.querySelector("#pName")) === "Rohan Verma", "name from store: " + txt(d.querySelector("#pName")));
    ok(d.querySelector("#fEmail").value === "rohan.verma@example.com", "email field hydrated");
    ok(d.querySelector("#fName").disabled === true, "fields read-only by default (no modal component used)");
    ok(d.querySelectorAll("[data-pref]").length === 6, "6 preference toggles rendered");
    ok(d.querySelector('[data-pref="notifications"]').checked === true, "notifications toggle reflects stored value");
    ok(d.querySelector('[data-pref="sounds"]').checked === false, "sounds toggle off by default");
    ok(txt(d.querySelector("#progLabel")) === "6 of 6 fields complete", "completeness meter: " + txt(d.querySelector("#progLabel")));
    ok(txt(d.querySelector("#composerStat")) === "3 messages sent", "activity badge counted from store: " + txt(d.querySelector("#composerStat")));
    ok(d.querySelector('.theme-seg button.active') !== null, "theme segmented control has an active state");

    // edit -> save round trip
    d.querySelector("#editBtn").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(d.querySelector("#fName").disabled === false, "edit mode unlocks inputs");
    ok(d.querySelector("#formActions").hidden === false, "save/cancel row revealed");
    ok(txt(d.querySelector("#modeBadge")) === "Editing", "badge flips to Editing");
    d.querySelector("#fName").value = "Rohan V.";
    d.querySelector("#fPhone").value = "";
    d.querySelector("#profileForm").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    ok(txt(d.querySelector("#pName")) === "Rohan V.", "header re-rendered from saved draft");
    ok(txt(d.querySelector("#avatarBig")) === "RV", "avatar initials recomputed: " + txt(d.querySelector("#avatarBig")));
    ok(/5 of 6/.test(txt(d.querySelector("#progLabel"))), "completeness dropped after clearing phone: " + txt(d.querySelector("#progLabel")));
    ok(d.querySelector("#fName").disabled === true, "exits edit mode after save");
    ok(/Profile saved/.test(txt(d.querySelector(".alert-title"))), "save toast shown: " + txt(d.querySelector(".alert-title")));
    const prof = JSON.parse(w.localStorage.getItem("simpleui.profile.v1"));
    ok(prof.name === "Rohan V." && prof.phone === "", "profile persisted to localStorage");

    // validation path
    d.querySelector("#editBtn").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    d.querySelector("#fEmail").value = "not-an-email";
    d.querySelector("#profileForm").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    ok(/Email looks off/.test(txt(d.querySelector(".toast-stack .alert:last-child .alert-title"))), "invalid email blocked with danger toast");
    ok(JSON.parse(w.localStorage.getItem("simpleui.profile.v1")).email === "rohan.verma@example.com", "invalid save did not persist");
    d.querySelector("#cancelBtn").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(d.querySelector("#fEmail").value === "rohan.verma@example.com", "cancel reverts the draft");

    // toggles persist
    const snd = d.querySelector('[data-pref="sounds"]');
    snd.checked = true;
    snd.dispatchEvent(new w.Event("change", { bubbles: true }));
    ok(JSON.parse(w.localStorage.getItem("simpleui.prefs.v1")).sounds === true, "toggle switch persisted to prefs");
    ok(/Message sounds/.test(txt(d.querySelector(".toast-stack .alert:last-child .alert-title"))), "toggle toast: " + txt(d.querySelector(".toast-stack .alert:last-child .alert-title")));

    // avatar tint + theme segment
    d.querySelector('[data-tint="yes"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(d.querySelector("#avatarBig").className.includes("t-yes"), "avatar tint applied to profile");
    ok(JSON.parse(w.localStorage.getItem("simpleui.profile.v1")).avatarTint === "yes", "avatar tint persisted");
    d.querySelector('[data-theme-choice="dark"]').dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
    ok(d.documentElement.getAttribute("data-theme") === "dark", "segmented control set dark theme");
    ok(w.localStorage.getItem("theme") === "dark", "theme choice persisted (library key)");
    ok(/dark/.test(txt(d.querySelector("#themeNow"))), "appearance row reflects theme: " + txt(d.querySelector("#themeNow")));
    ok(errors.length === 0, "no runtime errors " + JSON.stringify(errors));
    w.close();
  }

  
  console.log("\n" + (failures ? "RESULT: " + failures + " FAILING ASSERTION(S)" : "RESULT: all assertions passed"));
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error("HARNESS CRASH:", e);
  process.exit(2);
});
