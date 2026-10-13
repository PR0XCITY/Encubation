(() => {
  "use strict";

  const COURSE = "Understanding Incubation and Entrepreneurship";
  const ALL = window.QUESTIONS.map((q, id) => ({ ...q, id }));
  const WEEKS = [...new Set(ALL.map(q => q.w))].sort((a, b) => a - b);
  const app = document.getElementById("app");
  const LETTERS = ["A", "B", "C", "D", "E", "F"];

  // ── storage (best-effort; the site works without it) ──
  const store = {
    get(k, d) { try { const v = localStorage.getItem("iie-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("iie-" + k, JSON.stringify(v)); } catch (e) {} },
  };

  let mode = store.get("mode", "practice"); // "practice" = instant feedback, "exam" = reveal at end
  let state = null;

  // ── helpers ──
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const isPinned = t => /^(all|none|both) of the above$/i.test(t.trim());

  // Shuffle a question's options, keeping "All of the above" style options last.
  function prepare(q) {
    const idx = q.o.map((_, i) => i);
    const free = shuffle(idx.filter(i => !isPinned(q.o[i])));
    const pinned = idx.filter(i => isPinned(q.o[i]));
    const order = free.concat(pinned);
    return {
      ...q,
      opts: order.map(i => q.o[i]),
      correct: order.map((orig, pos) => (q.a.includes(orig) ? pos : -1)).filter(p => p >= 0),
      multi: q.a.length > 1,
      picked: [],
      done: false,
      right: null,
    };
  }

  const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const fmtTime = ms => {
    const s = Math.round(ms / 1000), m = Math.floor(s / 60);
    return m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
  };
  const keyFor = scope => (scope === "all" ? "best-all" : "best-w" + scope);
  const icon = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  };

  function scorePill(best) {
    if (best == null) return '<span class="pill">Not attempted</span>';
    const cls = best >= 80 ? "good" : best >= 50 ? "mid" : "bad";
    return `<span class="pill ${cls}">Best ${best}%</span>`;
  }

  // ── Home ──
  function renderHome() {
    state = null;
    const bestAll = store.get(keyFor("all"), null);
    app.innerHTML = `
      <section class="view">
        <div class="hero">
          <span class="eyebrow"><span class="dot"></span>NPTEL practice quiz</span>
          <h1><span class="grad">${esc(COURSE)}</span></h1>
          <p>Every assignment question from Weeks 1–12 in one place. Questions and options are reshuffled every time you start.</p>
          <div class="stats">
            <div class="stat"><b>${ALL.length}</b><span>Questions</span></div>
            <div class="stat"><b>${WEEKS.length}</b><span>Weeks</span></div>
            <div class="stat"><b>${ALL.filter(q => q.a.length > 1).length}</b><span>Multi-answer</span></div>
          </div>
        </div>

        <div class="mode-toggle">
          <div class="label">
            <b>Answer mode</b>
            <span id="modeDesc">${mode === "practice" ? "See whether you're right after every question." : "Answers stay hidden until you finish, like the real test."}</span>
          </div>
          <div class="seg" role="group" aria-label="Answer mode">
            <button data-mode="practice" aria-pressed="${mode === "practice"}">Practice</button>
            <button data-mode="exam" aria-pressed="${mode === "exam"}">Exam</button>
          </div>
        </div>

        <div class="full-card">
          <div>
            <span class="tag">Full course</span>
            <h2>All ${ALL.length} questions</h2>
            <p>Every week mixed together in random order.</p>
            ${bestAll != null ? `<span class="best">Best score: ${bestAll}%</span>` : ""}
          </div>
          <button class="btn-light" data-start="all">Start full test ${icon.arrow}</button>
        </div>

        <div class="section-head">
          <h3>Practice by week</h3>
          <span>10 questions each</span>
        </div>
        <div class="weeks">
          ${WEEKS.map(w => `
            <button class="week-card" data-start="${w}">
              <div class="top"><span class="week-num">${w}</span><span class="arrow">${icon.arrow}</span></div>
              <h4>Week ${w}</h4>
              <div class="meta"><span>${ALL.filter(q => q.w === w).length} questions</span>${scorePill(store.get(keyFor(w), null))}</div>
            </button>`).join("")}
        </div>
      </section>`;

    app.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      store.set("mode", mode);
      app.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-pressed", x === b));
      document.getElementById("modeDesc").textContent = mode === "practice"
        ? "See whether you're right after every question."
        : "Answers stay hidden until you finish, like the real test.";
    }));
    app.querySelectorAll("[data-start]").forEach(b => b.addEventListener("click", () => {
      const s = b.dataset.start;
      start(s === "all" ? "all" : Number(s));
    }));
    window.scrollTo({ top: 0 });
  }

  // ── Quiz ──
  function start(scope, subset) {
    const pool = subset || (scope === "all" ? ALL : ALL.filter(q => q.w === scope));
    state = {
      scope,
      retry: !!subset,
      mode,
      qs: shuffle(pool).map(prepare),
      i: 0,
      startedAt: Date.now(),
    };
    renderQuestion();
  }

  const titleFor = s => (s.retry ? "Mistakes review" : s.scope === "all" ? "Full course test" : `Week ${s.scope}`);

  function renderQuestion() {
    const s = state, q = s.qs[s.i], total = s.qs.length;
    const answered = s.qs.filter(x => x.done);
    const right = answered.filter(x => x.right).length;
    const reveal = s.mode === "practice" && q.done;
    const fresh = s.shown !== s.i;
    s.shown = s.i;

    app.innerHTML = `
      <section class="${fresh ? "view" : ""}">
        <div class="quiz-head">
          <div class="quiz-title">
            <button class="ghost-btn" id="quitBtn" aria-label="Quit to home">${icon.back}<span>Quit</span></button>
            <div><h2>${esc(titleFor(s))}</h2><small>${s.mode === "practice" ? "Practice mode" : "Exam mode"}</small></div>
          </div>
          ${s.mode === "practice" ? `<div class="score-chip"><span class="c" title="Correct">${icon.check.replace("<svg", '<svg width="14" height="14"')}${right}</span><span class="w" title="Wrong">${icon.x.replace("<svg", '<svg width="14" height="14"')}${answered.length - right}</span></div>` : ""}
        </div>
        <div class="progress" aria-hidden="true"><div style="width:${(s.i / total) * 100}%"></div></div>

        <article class="q-card">
          <div class="q-meta">
            <span class="count">Question <b>${s.i + 1}</b> of ${total}</span>
            ${s.scope === "all" || s.retry ? `<span class="badge">Week ${q.w}</span>` : ""}
            ${q.multi ? '<span class="badge multi">Select all that apply</span>' : ""}
          </div>
          <h3 class="q-text">${esc(q.q)}</h3>
          <div class="options" role="${q.multi ? "group" : "radiogroup"}">
            ${q.opts.map((t, i) => {
              let cls = "opt" + (q.multi ? " multi" : "");
              const picked = q.picked.includes(i), isRight = q.correct.includes(i);
              if (reveal) {
                if (isRight && picked) cls += " correct";
                else if (isRight) cls += " correct missed";
                else if (picked) cls += " wrong";
                else cls += " dim";
              } else if (picked) cls += " selected";
              return `<button class="${cls}" data-i="${i}" ${reveal ? "disabled" : ""} role="${q.multi ? "checkbox" : "radio"}" aria-checked="${picked}">
                <span class="key">${LETTERS[i]}</span><span class="txt">${esc(t)}</span>
                <span class="mark ok">${icon.check}</span><span class="mark no">${icon.x}</span>
              </button>`;
            }).join("")}
          </div>
          ${reveal ? feedbackHTML(q) : ""}
          <div class="q-actions">
            <span class="hint">Keys: <kbd>A</kbd>–<kbd>D</kbd> to pick · <kbd>Enter</kbd> to continue</span>
            ${actionButton(s, q)}
          </div>
        </article>
      </section>`;

    app.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => pick(Number(b.dataset.i))));
    document.getElementById("quitBtn").addEventListener("click", () => {
      if (s.qs.some(x => x.picked.length) && !confirm("Quit this quiz? Your progress will be lost.")) return;
      renderHome();
    });
    const act = document.getElementById("actBtn");
    act && act.addEventListener("click", primaryAction);
  }

  function feedbackHTML(q) {
    if (q.right) return `<div class="feedback ok">${icon.check}<span>Correct!</span></div>`;
    const ans = q.correct.map(i => q.opts[i]).join("; ");
    return `<div class="feedback no">${icon.x}<span>Not quite. <span class="ans">Correct answer: ${esc(ans)}</span></span></div>`;
  }

  function actionButton(s, q) {
    const last = s.i === s.qs.length - 1;
    const nextLabel = last ? "See results" : "Next question";
    if (s.mode === "practice") {
      if (q.done) return `<button class="btn" id="actBtn">${nextLabel} ${icon.arrow}</button>`;
      if (q.multi) return `<button class="btn" id="actBtn" ${q.picked.length ? "" : "disabled"}>Check answer</button>`;
      return `<button class="btn" id="actBtn" disabled>Pick an answer</button>`;
    }
    return `<button class="btn" id="actBtn" ${q.picked.length ? "" : "disabled"}>${last ? "Finish test" : "Next question"} ${icon.arrow}</button>`;
  }

  function pick(i) {
    const s = state, q = s.qs[s.i];
    if (q.done && s.mode === "practice") return;
    if (q.multi) q.picked = q.picked.includes(i) ? q.picked.filter(x => x !== i) : q.picked.concat(i);
    else q.picked = [i];
    if (s.mode === "practice" && !q.multi) grade(q);
    renderQuestion();
  }

  function grade(q) {
    q.done = true;
    q.right = sameSet(q.picked, q.correct);
  }

  function primaryAction() {
    const s = state, q = s.qs[s.i];
    if (!q.picked.length) return;
    if (s.mode === "practice" && !q.done) { grade(q); renderQuestion(); return; }
    if (s.mode === "exam") grade(q);
    if (s.i < s.qs.length - 1) { s.i++; renderQuestion(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else finish();
  }

  // ── Results ──
  function finish() {
    const s = state;
    s.qs.forEach(q => { if (!q.done) grade(q); });
    s.elapsed = Date.now() - s.startedAt;
    const right = s.qs.filter(q => q.right).length;
    const pct = Math.round((right / s.qs.length) * 100);
    if (!s.retry) {
      const k = keyFor(s.scope), prev = store.get(k, null);
      if (prev == null || pct > prev) store.set(k, pct);
    }
    renderResults(right, pct);
    if (pct >= 80) confetti();
  }

  function renderResults(right, pct, filter = "all") {
    const s = state, total = s.qs.length, wrong = total - right;
    const msg = pct === 100 ? ["Perfect score!", "You nailed every single question."]
      : pct >= 80 ? ["Excellent work!", "You clearly know this material."]
      : pct >= 60 ? ["Good effort!", "A little more revision and you'll ace it."]
      : pct >= 40 ? ["Keep going!", "Review the answers below and try again."]
      : ["Time to revise", "Go through the review below, then give it another shot."];
    const C = 2 * Math.PI * 70;

    const byWeek = (s.scope === "all" || s.retry) ? WEEKS.map(w => {
      const qs = s.qs.filter(q => q.w === w);
      return qs.length ? { w, n: qs.length, r: qs.filter(q => q.right).length } : null;
    }).filter(Boolean) : [];

    const list = s.qs.filter(q => filter === "all" || !q.right);

    app.innerHTML = `
      <section class="view">
        <div class="result-hero">
          <div class="ring">
            <svg viewBox="0 0 160 160">
              <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
              <circle class="track" cx="80" cy="80" r="70" fill="none" stroke-width="14"/>
              <circle class="val" id="ringVal" cx="80" cy="80" r="70" fill="none" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
            </svg>
            <div class="center"><div><b>${pct}%</b><span>${right} / ${total}</span></div></div>
          </div>
          <div>
            <h2>${msg[0]}</h2>
            <p>${msg[1]} <br>${esc(titleFor(s))} · ${s.mode === "practice" ? "Practice" : "Exam"} mode</p>
            <div class="result-stats">
              <div><b>${right}</b>Correct</div>
              <div><b>${wrong}</b>Wrong</div>
              <div><b>${fmtTime(s.elapsed)}</b>Time taken</div>
            </div>
            <div class="result-actions">
              <button class="btn" id="retryBtn">${icon.redo} Try again</button>
              ${wrong ? `<button class="btn secondary" id="mistakesBtn">${icon.target} Practice ${wrong} mistake${wrong > 1 ? "s" : ""}</button>` : ""}
              <button class="btn secondary" id="homeBtn">${icon.home} Home</button>
            </div>
          </div>
        </div>

        ${byWeek.length > 1 ? `
        <div class="breakdown">
          <h3>Score by week</h3>
          <div class="bars">
            ${byWeek.map(b => `<div class="bar-row"><span class="lbl">Week ${b.w}</span><div class="track"><div class="fill" style="width:${(b.r / b.n) * 100}%"></div></div><span class="num">${b.r}/${b.n}</span></div>`).join("")}
          </div>
        </div>` : ""}

        <div class="review-head">
          <h3>Review answers</h3>
          <div class="seg" role="group" aria-label="Filter review">
            <button data-f="all" aria-pressed="${filter === "all"}">All (${total})</button>
            <button data-f="wrong" aria-pressed="${filter === "wrong"}">Wrong (${wrong})</button>
          </div>
        </div>
        <div class="review">
          ${list.length ? list.map(q => `
            <div class="r-item ${q.right ? "ok" : "no"}">
              <div class="r-top"><span class="badge">Week ${q.w}</span>${q.right ? "Correct" : "Incorrect"}</div>
              <p class="r-q">${esc(q.q)}</p>
              <div class="r-line yours"><span>Your answer</span><span>${esc(q.picked.map(i => q.opts[i]).join("; ") || "—")}</span></div>
              ${q.right ? "" : `<div class="r-line right"><span>Correct</span><span>${esc(q.correct.map(i => q.opts[i]).join("; "))}</span></div>`}
            </div>`).join("") : '<div class="empty">No wrong answers — nothing to review here. 🎉</div>'}
        </div>
      </section>`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const r = document.getElementById("ringVal");
      if (r) r.style.strokeDashoffset = C * (1 - pct / 100);
    }));

    document.getElementById("retryBtn").addEventListener("click", () => {
      const pool = s.retry ? s.qs.map(q => ALL[q.id]) : null;
      mode = s.mode;
      start(s.scope, pool);
    });
    const mb = document.getElementById("mistakesBtn");
    mb && mb.addEventListener("click", () => {
      mode = s.mode;
      start(s.scope, s.qs.filter(q => !q.right).map(q => ALL[q.id]));
    });
    document.getElementById("homeBtn").addEventListener("click", renderHome);
    app.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => renderResults(right, pct, b.dataset.f)));
    if (filter === "all") window.scrollTo({ top: 0 });
  }

  function confetti() {
    const box = document.createElement("div");
    box.className = "confetti";
    const colors = ["#5b4bff", "#8a5cff", "#ffb547", "#16a36a", "#ff6b9a"];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 2 + Math.random() * 2 + "s";
      p.style.animationDelay = Math.random() * .6 + "s";
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 5000);
  }

  // ── Keyboard ──
  document.addEventListener("keydown", e => {
    if (!state || state.elapsed != null || e.ctrlKey || e.metaKey || e.altKey) return;
    const q = state.qs[state.i];
    const k = e.key.toUpperCase();
    const n = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : "123456".indexOf(e.key);
    if (n >= 0 && n < q.opts.length) { e.preventDefault(); pick(n); }
    else if (e.key === "Enter") {
      if (document.activeElement && document.activeElement.classList.contains("opt")) e.preventDefault();
      primaryAction();
    }
  });

  // ── Theme ──
  document.getElementById("themeBtn").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("iie-theme", root.dataset.theme); } catch (e) {}
  });
  document.getElementById("brandBtn").addEventListener("click", () => {
    if (state && state.elapsed == null && state.qs.some(x => x.picked.length) && !confirm("Leave this quiz? Your progress will be lost.")) return;
    renderHome();
  });

  renderHome();
})();
