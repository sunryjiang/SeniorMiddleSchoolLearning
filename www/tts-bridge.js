/*
 * TTS 桥接：安卓 WebView 不支持 Web Speech API(speechSynthesis)，
 * 这里用 Capacitor 的原生 TextToSpeech 插件伪装出一个 speechSynthesis，
 * 让 vocab.js / reading.js / app.js 里原来的朗读代码无需改动即可发音。
 *
 * 发音质量：
 *  - 英语统一使用用户在首页选择的口音（美式 en-US / 英式 en-GB）。
 *  - 主动在设备已安装的音色中挑选最合适的英语音色（优先精确口音、优先 Google 引擎）。
 * 仅在 Capacitor 原生环境下生效；普通浏览器仍用系统自带的 speechSynthesis。
 */
(function () {
  "use strict";
  var Cap = window.Capacitor;
  var isNative = !!(Cap && typeof Cap.isNativePlatform === "function" && Cap.isNativePlatform());
  if (!isNative) return;
  var TTS = Cap.Plugins && Cap.Plugins.TextToSpeech;
  if (!TTS) return;

  var rawVoices = [];
  function refreshVoices(cb) {
    if (!TTS.getSupportedVoices) { if (cb) cb(); return; }
    TTS.getSupportedVoices()
      .then(function (r) { rawVoices = (r && r.voices) || []; if (cb) cb(); })
      .catch(function () { if (cb) cb(); });
  }
  refreshVoices();

  function norm(s) { return (s || "").toLowerCase().replace(/_/g, "-"); }
  function accent() {
    try { return localStorage.getItem("ttsAccent") || "en-US"; }
    catch (e) { return "en-US"; }
  }

  // 选出最合适的英语音色：优先精确口音(en-us/en-gb)，优先 Google 优质音色，避开 eSpeak/Pico 等机械音
  function pickVoiceIndex(targetLang) {
    if (!rawVoices.length) return -1;
    var t = norm(targetLang);          // en-us
    var base = t.split("-")[0];        // en
    var bestI = -1, best = -1;
    for (var i = 0; i < rawVoices.length; i++) {
      var v = rawVoices[i];
      var lang = norm(v.lang);
      var name = norm(v.name) + " " + norm(v.voiceURI);
      var s = -1;
      if (lang === t) s = 100;
      else if (lang.indexOf(base + "-") === 0 || lang === base) s = 40;
      if (s < 0) continue;             // 非目标语言，跳过
      if (name.indexOf("google") >= 0) s += 30;      // Google 神经网络音，自然
      if (name.indexOf("-local") >= 0) s += 8;       // 本地高质量音，离线可用
      else if (name.indexOf("network") >= 0) s += 4; // 网络音质量高但需联网
      if (/espeak|pico|formant/.test(name)) s -= 60; // 机械合成音，尽量避开
      if (s > best) { best = s; bestI = i; }
    }
    return bestI;
  }

  function Utter(text) {
    this.text = text || "";
    this.lang = "en-US";
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.onend = null;
    this.onerror = null;
    this.onstart = null;
  }
  window.SpeechSynthesisUtterance = Utter;

  var curToken = 0, speakingFlag = false, pausedFlag = false;
  function clampRate(r) { r = Number(r) || 1; if (r < 0.1) r = 0.1; if (r > 2) r = 2; return r; }

  var shim = {
    getVoices: function () {
      return rawVoices.map(function (v) {
        return { lang: v.lang, name: v.name, voiceURI: v.voiceURI, default: !!v.default };
      });
    },
    speak: function (u) {
      if (!u) return;
      var token = ++curToken;
      speakingFlag = true; pausedFlag = false;
      var lang = u.lang || "en-US";
      if (norm(lang).indexOf("en") === 0) lang = accent(); // 英语一律用所选口音
      var opts = {
        text: u.text, lang: lang, rate: clampRate(u.rate),
        pitch: Number(u.pitch) || 1,
        volume: u.volume == null ? 1.0 : Number(u.volume),
        category: "playback"
      };
      var vi = pickVoiceIndex(lang);
      if (vi >= 0) opts.voice = vi;
      if (typeof u.onstart === "function") { try { u.onstart(); } catch (e) {} }
      TTS.speak(opts)
        .then(function () {
          if (token !== curToken) return;
          speakingFlag = false;
          if (typeof u.onend === "function") { try { u.onend(); } catch (e) {} }
        })
        .catch(function (err) {
          if (token !== curToken) return;
          speakingFlag = false;
          if (typeof u.onerror === "function") { try { u.onerror(err); } catch (e) {} }
          else if (typeof u.onend === "function") { try { u.onend(); } catch (e) {} }
        });
    },
    cancel: function () {
      curToken++; speakingFlag = false; pausedFlag = false;
      if (TTS.stop) TTS.stop().catch(function () {});
    },
    pause: function () {
      curToken++; speakingFlag = false; pausedFlag = true;
      if (TTS.stop) TTS.stop().catch(function () {});
    },
    resume: function () { pausedFlag = false; },
    addEventListener: function (ev, cb) { if (ev === "voiceschanged") refreshVoices(cb); },
    removeEventListener: function () {},
    get speaking() { return speakingFlag; },
    get paused() { return pausedFlag; },
    get pending() { return false; },
    onvoiceschanged: null
  };

  try { Object.defineProperty(window, "speechSynthesis", { value: shim, configurable: true }); }
  catch (e) { window.speechSynthesis = shim; }
})();
