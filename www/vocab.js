/* 背单词工具：卡片式记忆 + 点读发音（Web Speech API / 原生 TTS 桥接） */
(function () {
  "use strict";

  const synth = window.speechSynthesis || null;
  let voices = [];
  function loadVoices() {
    if (synth) voices = synth.getVoices() || [];
  }
  loadVoices();
  if (synth && typeof synth.onvoiceschanged !== "undefined") {
    synth.onvoiceschanged = loadVoices;
  }
  function accent() {
    try { return localStorage.getItem("ttsAccent") || "en-US"; } catch (e) { return "en-US"; }
  }
  function pickEnVoice() {
    if (!voices.length) loadVoices();
    const acc = accent();
    return (
      voices.find((v) => new RegExp(acc.replace("-", "[-_]"), "i").test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      null
    );
  }
  function speak(text, rate) {
    if (!synth) { alert("当前环境不支持语音朗读，请用手机 App 或 Chrome/Edge。"); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = accent();
    const v = pickEnVoice();
    if (v) u.voice = v;
    u.rate = rate || 0.9;
    synth.speak(u);
  }

  const els = {
    unitList: document.getElementById("unitList"),
    side: document.getElementById("vocabSide"),
    overlay: document.getElementById("overlay"),
    menuToggle: document.getElementById("menuToggle"),
    toolbar: document.getElementById("vocabToolbar"),
    vtTitle: document.getElementById("vtTitle"),
    vtProgress: document.getElementById("vtProgress"),
    autoPlay: document.getElementById("autoPlay"),
    showCn: document.getElementById("showCn"),
    cardArea: document.getElementById("cardArea"),
    cardControls: document.getElementById("cardControls"),
    prevBtn: document.getElementById("prevBtn"),
    speakBtn: document.getElementById("speakBtn"),
    flipBtn: document.getElementById("flipBtn"),
    knownBtn: document.getElementById("knownBtn"),
    nextBtn: document.getElementById("nextBtn"),
  };

  let DATA = null;
  let curWords = [];
  let idx = 0;
  let flipped = false;
  let known = {};

  fetch("data/vocab.json?v=" + Date.now())
    .then((r) => { if (!r.ok) throw new Error("无法加载 vocab.json"); return r.json(); })
    .then((json) => { DATA = json; buildUnitList(); })
    .catch((e) => { els.cardArea.innerHTML = '<div class="vocab-empty">加载失败：' + e.message + "</div>"; });

  function buildUnitList() {
    els.unitList.innerHTML = "";
    DATA.units.forEach((u, i) => {
      const b = document.createElement("button");
      b.className = "unit-btn";
      b.innerHTML = '<span class="ub-title">' + u.title + '</span><span class="ub-count">' + (u.count || (u.words ? u.words.length : 0)) + " 词</span>";
      b.onclick = () => selectUnit(i);
      els.unitList.appendChild(b);
    });
  }

  function selectUnit(i) {
    Array.from(els.unitList.children).forEach((c, j) => c.classList.toggle("active", j === i));
    curWords = DATA.units[i].words;
    idx = 0; flipped = false; known = {};
    els.vtTitle.textContent = DATA.units[i].title;
    els.toolbar.classList.remove("hidden");
    els.cardControls.classList.remove("hidden");
    renderCard();
    closeSide();
  }

  function toggleSide() { if (!els.side) return; els.side.classList.toggle("open"); if (els.overlay) els.overlay.classList.toggle("show"); }
  function closeSide() { if (els.side) els.side.classList.remove("open"); if (els.overlay) els.overlay.classList.remove("show"); }
  if (els.menuToggle) els.menuToggle.onclick = toggleSide;
  if (els.overlay) els.overlay.onclick = closeSide;

  function resetVocabHome() {
    curWords = []; idx = 0; flipped = false;
    els.toolbar.classList.add("hidden");
    els.cardControls.classList.add("hidden");
    els.cardArea.innerHTML = '<div class="vocab-empty">点左上角 ☰ 选择一个单元开始背单词</div>';
    Array.from(els.unitList.children).forEach((c) => c.classList.remove("active"));
    closeSide();
  }
  var backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", function () {
    if (curWords.length) resetVocabHome();
    else window.location.href = "english.html";
  });

  function renderCard() {
    if (!curWords.length) return;
    const w = curWords[idx];
    const showCn = els.showCn.checked;
    els.vtProgress.textContent = "第 " + (idx + 1) + " / " + curWords.length + " 个 · 已认识 " + Object.keys(known).length + " 个";
    const ipaHtml = w.ipa ? '<div class="fc-ipa">/' + w.ipa + "/</div>" : "";
    const front =
      '<div class="flash front">' +
      '<div class="fc-word">' + w.word + "</div>" + ipaHtml +
      (w.pos ? '<div class="fc-pos">' + w.pos + "</div>" : "") +
      '<div class="fc-hint">点“翻面”看释义 · 点🔊听发音</div></div>';
    const back =
      '<div class="flash back">' +
      '<div class="fc-word">' + w.word + "</div>" + ipaHtml +
      (w.pos ? '<div class="fc-pos">' + w.pos + "</div>" : "") +
      (showCn ? '<div class="fc-cn">' + (w.cn || "") + "</div>" : "") +
      (w.eg ? '<div class="fc-eg"><span class="eg-spk" data-eg="' + encodeURIComponent(w.eg) + '">🔊</span> ' + w.eg + "</div>" : "") +
      "</div>";
    els.cardArea.innerHTML = '<div class="flash-card' + (flipped ? " is-flipped" : "") + (known[w.word] ? " is-known" : "") + '">' + front + back + "</div>";
    const egSpk = els.cardArea.querySelector(".eg-spk");
    if (egSpk) egSpk.onclick = (e) => { e.stopPropagation(); speak(decodeURIComponent(egSpk.dataset.eg), 0.85); };
    const card = els.cardArea.querySelector(".flash-card");
    if (card) card.onclick = flip;
  }

  function flip() { flipped = !flipped; renderCard(); if (flipped && els.autoPlay.checked) speak(curWords[idx].word); }
  function go(delta) { idx = (idx + delta + curWords.length) % curWords.length; flipped = false; renderCard(); if (els.autoPlay.checked) speak(curWords[idx].word); }

  els.prevBtn.onclick = () => go(-1);
  els.nextBtn.onclick = () => go(1);
  els.flipBtn.onclick = flip;
  els.speakBtn.onclick = () => speak(curWords[idx].word);
  els.knownBtn.onclick = () => { known[curWords[idx].word] = true; go(1); };
  els.showCn.onchange = renderCard;

  document.addEventListener("keydown", (e) => {
    if (!curWords.length) return;
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === " ") { e.preventDefault(); flip(); }
    else if (e.key.toLowerCase() === "s") speak(curWords[idx].word);
  });
})();
