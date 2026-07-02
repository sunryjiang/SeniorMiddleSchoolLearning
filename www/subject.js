/* 通用学科学习引擎：读取 data/<subject>.json，渲染知识点讲解 + 例题 + 练习。
   目录三级结构：大类(category) → 子类(subcategory) → 知识点(item)。
   公式用 KaTeX 渲染（行内 $...$，整式 $$...$$，formula 块整块渲染）。
   配图用 svg / image 块（离线内联，图文并茂）。
   数据格式见 data/math.json 示例，可用于数学/物理/化学/生物等任意学科。 */
(function () {
  "use strict";

  let DATA = { subject: "", categories: [], items: [] };
  let currentIndex = -1;

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const subject = new URLSearchParams(location.search).get("subject") || "math";
  const BACK = new URLSearchParams(location.search).get("back") || "index.html";
  const FILE = "data/" + subject + ".json";

  // ---------- 顶部快捷导航条 ----------
  (function buildModBar() {
    const header = document.querySelector(".topbar");
    if (!header) return;
    const isEn = subject.indexOf("en-") === 0;
    const links = isEn
      ? [
          ["英语首页", "english.html"],
          ["语法", "subject.html?subject=en-grammar&back=english.html"],
          ["背单词", "vocab.html"],
          ["阅读", "reading.html"],
          ["写作", "subject.html?subject=en-writing&back=english.html"],
          ["题型", "subject.html?subject=en-exam&back=english.html"],
          ["听力", "listening.html"],
          ["短语", "subject.html?subject=en-phrases&back=english.html"],
        ]
      : [
          ["🏠 全科首页", "index.html"],
          ["数学", "subject.html?subject=math"],
          ["物理", "subject.html?subject=physics"],
          ["化学", "subject.html?subject=chemistry"],
          ["生物", "subject.html?subject=biology"],
          ["英语", "english.html"],
        ];
    const bar = document.createElement("nav");
    bar.className = "mod-bar";
    links.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.textContent = label;
      a.href = href;
      if (href.indexOf("subject=" + subject) !== -1) a.classList.add("active");
      bar.appendChild(a);
    });
    header.insertAdjacentElement("afterend", bar);
  })();

  // ---------- KaTeX 渲染 ----------
  function typeset(node) {
    if (!node || typeof renderMathInElement !== "function") return;
    try {
      renderMathInElement(node, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        throwOnError: false,
        strict: false,
      });
    } catch (e) { /* 忽略单点渲染错误 */ }
  }

  // ---------- 加载数据 ----------
  fetch(FILE + "?v=" + Date.now())
    .then((r) => {
      if (!r.ok) throw new Error("无法加载 " + FILE);
      return r.json();
    })
    .then((json) => {
      DATA = json;
      applyMeta();
      buildNav();
      buildHome();
      handleHash();
    })
    .catch((err) => {
      $("#home").innerHTML =
        "<h1>加载失败</h1><p>请通过本地服务器或 App 打开本页面。<br>错误：" +
        err.message + "</p>";
    });

  function applyMeta() {
    const name = DATA.subject || "学科";
    document.title = name + " · 高中理科复习";
    const bt = $("#brandTitle");
    if (bt) bt.textContent = name;
    const ht = $("#homeTitle");
    if (ht) ht.textContent = name + " · 知识点精讲精练";
  }

  // ---------- 目录辅助：取某大类下、按出现顺序排列的子类 ----------
  function subcatsOf(cat) {
    const seen = [];
    DATA.items.forEach((it) => {
      if (it.category !== cat) return;
      const sub = it.subcategory || "";
      if (seen.indexOf(sub) === -1) seen.push(sub);
    });
    return seen;
  }

  // ---------- 侧栏目录（三级，可折叠） ----------
  function buildNav() {
    const nav = $("#nav");
    nav.innerHTML = "";
    DATA.categories.forEach((cat, ci) => {
      const group = el("div", "cat-group");
      group.dataset.cat = cat;
      if (ci !== 0) group.classList.add("collapsed");

      const head = el("div", "cat-title");
      head.appendChild(el("span", "cat-caret", "▸"));
      head.appendChild(el("span", "cat-name", cat));
      head.addEventListener("click", () => group.classList.toggle("collapsed"));
      group.appendChild(head);

      const body = el("div", "cat-body");
      subcatsOf(cat).forEach((sub) => {
        if (sub) body.appendChild(el("div", "subcat-title", sub));
        DATA.items.forEach((it, idx) => {
          if (it.category !== cat || (it.subcategory || "") !== sub) return;
          const item = el("div", "nav-item");
          item.dataset.index = idx;
          item.dataset.title = it.title;
          item.appendChild(el("span", "num", it.id || ""));
          item.appendChild(el("span", null, it.title));
          item.addEventListener("click", () => { location.hash = "#/" + idx; });
          body.appendChild(item);
        });
      });
      group.appendChild(body);
      nav.appendChild(group);
    });
  }

  // ---------- 首页 ----------
  function buildHome() {
    const totalItems = DATA.items.length;
    const totalEx = DATA.items.reduce((s, it) => s + (it.exercises ? it.exercises.length : 0), 0);
    const subCount = DATA.categories.reduce((s, c) => s + subcatsOf(c).filter(Boolean).length, 0);
    const stats = $("#homeStats");
    stats.innerHTML = "";
    [
      [DATA.categories.length, "大类"],
      [subCount || totalItems, subCount ? "专题" : "知识点"],
      [totalItems, "知识点"],
      [totalEx, "练习题"],
    ].forEach(([n, l]) => {
      const c = el("div", "stat-card");
      c.appendChild(el("div", "n", n));
      c.appendChild(el("div", "l", l));
      stats.appendChild(c);
    });

    const cats = $("#homeCats");
    cats.innerHTML = "";
    DATA.categories.forEach((cat) => {
      const box = el("div", "home-cat");
      box.appendChild(el("h3", null, cat));
      subcatsOf(cat).forEach((sub) => {
        if (sub) box.appendChild(el("div", "home-subcat", sub));
        DATA.items.forEach((it, idx) => {
          if (it.category !== cat || (it.subcategory || "") !== sub) return;
          const a = el("a", null, (it.id ? it.id + "  " : "") + it.title);
          a.addEventListener("click", () => (location.hash = "#/" + idx));
          box.appendChild(a);
        });
      });
      cats.appendChild(box);
    });
  }

  // ---------- 路由 ----------
  window.addEventListener("hashchange", handleHash);
  function handleHash() {
    const m = location.hash.match(/^#\/(\d+)$/);
    if (m) showLesson(parseInt(m[1], 10));
    else showHome();
    closeSidebar();
  }

  function showHome() {
    currentIndex = -1;
    $("#home").classList.remove("hidden");
    $("#lesson").classList.add("hidden");
    setActiveNav(-1);
    window.scrollTo(0, 0);
  }

  // ---------- 渲染知识点 ----------
  function showLesson(idx) {
    const it = DATA.items[idx];
    if (!it) return showHome();
    currentIndex = idx;
    $("#home").classList.add("hidden");
    const lesson = $("#lesson");
    lesson.classList.remove("hidden");
    lesson.innerHTML = "";

    lesson.appendChild(el("h1", "lesson-title", it.title));
    const meta = (it.category || "") + (it.subcategory ? " · " + it.subcategory : "") +
                 (it.id ? " · " + it.id : "");
    lesson.appendChild(el("div", "lesson-cat", meta));

    (it.sections || []).forEach((sec) => {
      if (sec.heading) lesson.appendChild(el("div", "sec-heading", sec.heading));
      (sec.blocks || []).forEach((b) => lesson.appendChild(renderBlock(b)));
    });

    if (it.exercises && it.exercises.length) lesson.appendChild(renderPractice(it));
    lesson.appendChild(renderFooterNav(idx));
    typeset(lesson);
    setActiveNav(idx);
    window.scrollTo(0, 0);
  }

  function renderBlock(b) {
    switch (b.kind) {
      case "sub": return el("div", "b-sub", b.text);
      case "para": return el("p", "b-para", b.text);
      case "bullet": return el("div", "b-bullet", b.text);
      case "eg": return renderEg(b);
      case "note": return el("div", "b-note", b.text);
      case "formula": return renderFormula(b);
      case "table": return renderTable(b);
      case "svg": return renderFigure(b, "svg");
      case "image": return renderFigure(b, "image");
      default: return el("p", "b-para", b.text || "");
    }
  }

  // 例题块：题干 + 可选“解析”多行（solution 数组 / text）
  function renderEg(b) {
    const box = el("div", "b-eg");
    if (b.label) box.appendChild(el("div", "eg-label", b.label));
    if (b.text) box.appendChild(el("div", "eg-q", b.text));
    const sol = b.solution || b.analysis;
    if (sol) {
      box.appendChild(el("div", "eg-sol-title", "解析"));
      const lines = Array.isArray(sol) ? sol : [sol];
      lines.forEach((line) => box.appendChild(el("div", "eg-sol-line", line)));
    }
    return box;
  }

  function renderFormula(b) {
    const div = el("div", "b-formula");
    let t = b.text || "";
    // 若未含分隔符，则整块按 display 公式渲染
    if (t.indexOf("$") === -1 && t.indexOf("\\[") === -1) t = "$$" + t + "$$";
    div.textContent = t;
    return div;
  }

  function renderFigure(b, kind) {
    const fig = el("figure", "b-figure");
    const holder = el("div", "fig-holder");
    if (kind === "svg" && b.svg) {
      holder.innerHTML = b.svg;
    } else if (b.src) {
      const img = el("img", "fig-img");
      img.src = b.src;
      img.alt = b.caption || "";
      holder.appendChild(img);
    }
    fig.appendChild(holder);
    if (b.caption) fig.appendChild(el("figcaption", null, b.caption));
    return fig;
  }

  function renderTable(b) {
    const table = el("table", "g-table");
    const thead = el("thead");
    const trh = el("tr");
    (b.headers || []).forEach((hd) => trh.appendChild(el("th", null, hd)));
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = el("tbody");
    (b.rows || []).forEach((row) => {
      const tr = el("tr");
      row.forEach((cell) => tr.appendChild(el("td", null, cell)));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  // ---------- 练习区 ----------
  function renderPractice(it) {
    const wrap = el("div", "practice");
    wrap.appendChild(el("h2", null, "巩固练习"));
    if (it.instruction) wrap.appendChild(el("div", "instruction", it.instruction));

    const inputs = [];
    it.exercises.forEach((ex, i) => {
      const item = el("div", "q-item");
      const qtext = el("div", "q-text");
      qtext.appendChild(el("span", "q-num", i + 1 + "."));
      qtext.appendChild(document.createTextNode(" " + ex.q));
      if (ex.level) qtext.appendChild(el("span", "q-level", ex.level));
      item.appendChild(qtext);

      const input = el("input", "q-input");
      input.type = "text";
      input.placeholder = "在此输入答案…";
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") checkOne(i);
      });
      item.appendChild(input);

      const fb = el("div", "q-feedback");
      item.appendChild(fb);
      inputs.push({ input, fb, ex });
      wrap.appendChild(item);
    });

    function checkOne(i) {
      const { input, fb, ex } = inputs[i];
      const val = input.value.trim();
      if (!val) {
        input.classList.remove("correct", "wrong");
        fb.className = "q-feedback";
        fb.textContent = "";
        return false;
      }
      const ok = isCorrect(val, ex.answer);
      input.classList.toggle("correct", ok);
      input.classList.toggle("wrong", !ok);
      fb.className = "q-feedback " + (ok ? "ok" : "no");
      fb.innerHTML = "";
      if (ok) fb.appendChild(document.createTextNode("✓ 正确"));
      else {
        fb.appendChild(document.createTextNode("✗ 参考答案："));
        fb.appendChild(el("span", "ans", ex.answer));
      }
      if (ex.tip) fb.appendChild(el("span", "tip", "（" + ex.tip + "）"));
      typeset(fb);
      return ok;
    }

    const actions = el("div", "practice-actions");
    const checkBtn = el("button", "btn btn-primary", "提交并批改");
    const answerBtn = el("button", "btn btn-ghost", "显示答案");
    const resetBtn = el("button", "btn btn-ghost", "清空重做");
    const score = el("span", "score", "");

    checkBtn.addEventListener("click", () => {
      let correct = 0;
      inputs.forEach((_, i) => { if (checkOne(i)) correct++; });
      score.textContent = "得分：" + correct + " / " + inputs.length;
    });
    answerBtn.addEventListener("click", () => {
      inputs.forEach(({ input, fb, ex }) => {
        if (!input.value.trim()) input.value = firstAnswer(ex.answer);
        input.classList.remove("wrong");
        input.classList.add("correct");
        fb.className = "q-feedback ok";
        fb.innerHTML = "";
        fb.appendChild(document.createTextNode("参考答案："));
        fb.appendChild(el("span", "ans", ex.answer));
        if (ex.tip) fb.appendChild(el("span", "tip", "（" + ex.tip + "）"));
        typeset(fb);
      });
      score.textContent = "";
    });
    resetBtn.addEventListener("click", () => {
      inputs.forEach(({ input, fb }) => {
        input.value = "";
        input.classList.remove("correct", "wrong");
        fb.className = "q-feedback";
        fb.textContent = "";
      });
      score.textContent = "";
    });

    actions.appendChild(checkBtn);
    actions.appendChild(answerBtn);
    actions.appendChild(resetBtn);
    actions.appendChild(score);
    wrap.appendChild(actions);
    return wrap;
  }

  // ---------- 答案比对 ----------
  function normalize(s) {
    return String(s).toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/\s+/g, "")
      .replace(/[。.]+$/, "")
      .trim();
  }
  function firstAnswer(answer) {
    return String(answer).split(/\s*\/\s*/)[0].trim();
  }
  function isCorrect(input, answer) {
    const val = normalize(input);
    const candidates = [answer];
    String(answer).split(/\s*\/\s*/).forEach((a) => candidates.push(a));
    return candidates.some((c) => normalize(c) === val);
  }

  // ---------- 底部上一/下一 ----------
  function renderFooterNav(idx) {
    const nav = el("div", "lesson-footer-nav");
    const prev = el("button", null, "← 上一个");
    const next = el("button", null, "下一个 →");
    prev.disabled = idx <= 0;
    next.disabled = idx >= DATA.items.length - 1;
    prev.addEventListener("click", () => (location.hash = "#/" + (idx - 1)));
    next.addEventListener("click", () => (location.hash = "#/" + (idx + 1)));
    nav.appendChild(prev);
    nav.appendChild(next);
    return nav;
  }

  function setActiveNav(idx) {
    document.querySelectorAll(".nav-item").forEach((n) => {
      const on = parseInt(n.dataset.index, 10) === idx;
      n.classList.toggle("active", on);
      if (on) {
        const g = n.closest(".cat-group");
        if (g) g.classList.remove("collapsed");
        n.scrollIntoView({ block: "nearest" });
      }
    });
  }

  // ---------- 搜索 ----------
  const searchInput = $("#searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll(".nav-item").forEach((n) => {
        const t = (n.dataset.title || "").toLowerCase();
        n.classList.toggle("hidden", q && t.indexOf(q) === -1);
      });
      document.querySelectorAll(".cat-group").forEach((g) => {
        const anyVisible = g.querySelector(".nav-item:not(.hidden)");
        g.style.display = anyVisible ? "" : "none";
        if (q && anyVisible) g.classList.remove("collapsed");
      });
    });
  }

  // ---------- 侧栏（移动端） ----------
  const menuToggle = $("#menuToggle");
  if (menuToggle) menuToggle.addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
    $("#overlay").classList.toggle("show");
  });
  const overlay = $("#overlay");
  if (overlay) overlay.addEventListener("click", closeSidebar);
  function closeSidebar() {
    const sb = $("#sidebar"); if (sb) sb.classList.remove("open");
    const ov = $("#overlay"); if (ov) ov.classList.remove("show");
  }

  // ---------- 返回键（逐级返回） ----------
  const backBtn = $("#backBtn");
  if (backBtn) backBtn.addEventListener("click", () => {
    if (currentIndex >= 0) {
      showHome();
      if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      else location.hash = "";
    } else {
      location.href = BACK;
    }
  });
})();
