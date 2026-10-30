/* far-agent — Aplikasi Utama (UI/UX Refined) */
(() => {
"use strict";

/* ================= UTILITAS ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const LS = {
  get(k, d) {
    try { const v = localStorage.getItem("fa:" + k); return v ? JSON.parse(v) : d; }
    catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem("fa:" + k, JSON.stringify(v)); }
    catch (e) {
      if (String(e && e.name).includes("Quota")) {
        toast("Penyimpanan browser penuh. Hapus beberapa desain atau chat lama.", true);
      }
    }
  },
};

const tokEst = s => Math.round((s || "").length / 4);
const fmtTok = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "").replace(".", ",") + "M" : n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "").replace(".", ",") + "k" : String(n);
const fmtDate = t => {
  const d = new Date(t);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hari ini, " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Kemarin, " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};
const slug = s => (s || "proyek").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "proyek";

function toast(msg, bad) {
  const t = document.createElement("div");
  t.className = "toast" + (bad ? " bad" : "");
  t.innerHTML = bad
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><span>${esc(msg)}</span>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>${esc(msg)}</span>`;
  $("#toasts").append(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
    setTimeout(() => t.remove(), 250);
  }, bad ? 6500 : 3200);
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Disalin ke clipboard");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    toast(ok ? "Disalin ke clipboard" : "Browser menolak menyalin. Pilih teksnya lalu salin manual.", !ok);
  }
  if (btn) {
    const o = btn.innerHTML;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Tersalin`;
    setTimeout(() => (btn.innerHTML = o), 1500);
  }
}

/* ---------- Viewer capabilities (Claude.ai artifacts / standalone) ---------- */
const capCache = {};
function getCap(name) {
  if (!window.claude || typeof window.claude.use !== "function") return Promise.resolve(null);
  if (!capCache[name]) capCache[name] = window.claude.use(name).catch(() => null);
  return capCache[name];
}

async function saveFile(filename, data, type = "text/markdown;charset=utf-8") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const dl = await getCap("downloads");
  if (dl) {
    try {
      const r = await dl.save({ filename, data: blob });
      if (r && r.status === "saved") { toast("Diunduh: " + filename); return; }
    } catch (e) {
      if (e && e.code !== "unavailable") {
        if (e.code !== "cancelled" && e.code !== "declined") toast("Gagal mengunduh: " + (e.message || e.code), true);
        return;
      }
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename.split("/").pop();
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

async function saveZip(name, files) {
  if (!window.JSZip) return toast("Pustaka ZIP sedang dimuat. Coba sebentar lagi.", true);
  const z = new JSZip();
  for (const [p, c] of Object.entries(files)) z.file(p, c);
  const blob = await z.generateAsync({ type: "blob" });
  return saveFile(name, blob, "application/zip");
}

/* ---------- Markdown & Code formatting ---------- */
function md(text) {
  const t = text || "";
  if (window.marked && window.DOMPurify) {
    try {
      return DOMPurify.sanitize(marked.parse(t, { gfm: true, breaks: false }));
    } catch {}
  }
  return "<pre style='white-space:pre-wrap'>" + esc(t) + "</pre>";
}

function enhance(el) {
  $$("pre", el).forEach(pre => {
    if ($(".copy", pre)) return;
    const b = document.createElement("button");
    b.className = "btn sm copy";
    b.type = "button";
    b.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Salin`;
    b.onclick = () => copyText(pre.querySelector("code")?.innerText || pre.innerText.replace(/Salin$/, ""), b);
    pre.append(b);
  });
}

function streamTo(getEl) {
  let pending = "", raf = 0;
  return {
    push(t) {
      pending = t;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = getEl();
        if (el) { el.innerHTML = md(pending); el.classList.add("caret"); }
      });
    },
    end(t) {
      cancelAnimationFrame(raf); raf = 0;
      const el = getEl();
      if (el) { el.innerHTML = md(t ?? pending); el.classList.remove("caret"); enhance(el); }
    },
  };
}

/* ================= STATE & SETTINGS ================= */
const DEFAULT_SETTINGS = () => ({
  provider: "gemini",
  gkeys: [""],
  gmodel: "gemini-2.5-flash",
  key: "",
  model: "anthropic/claude-3.7-sonnet",
  lang: "Indonesia",
  theme: "auto",
});

const S = {
  settings: Object.assign(DEFAULT_SETTINGS(), LS.get("settings", {})),
  models: LS.get("models", null) || FALLBACK_MODELS,
  modelsFetched: LS.get("modelsAt", 0),
  gemModels: LS.get("gmodels", null) || GEMINI_FALLBACK,
  gemFetched: LS.get("gmodelsAt", 0),
  plans: LS.get("plans", null),
  chats: LS.get("chats", []),
  designs: LS.get("designs", []),
  pendingIdea: "",
  pendingStack: null,
};

if (!S.plans) {
  S.plans = [EXAMPLE_PLAN];
  LS.set("plans", S.plans);
}

const saveSettings = () => LS.set("settings", S.settings);
const savePlans = () => {
  LS.set("plans", S.plans);
  updateNavBadges();
};
const saveChats = () => LS.set("chats", S.chats.slice(0, 60));
const saveDesigns = () => LS.set("designs", S.designs.slice(0, 20));

function updateNavBadges() {
  const badge = $("#navPlansCount");
  if (badge) badge.textContent = S.plans.length || "0";
}

/* ================= THEME CONTROLLER ================= */
function applyTheme(theme) {
  S.settings.theme = theme;
  saveSettings();
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  updateThemeUI();
}

function isDarkMode() {
  if (S.settings.theme === "dark") return true;
  if (S.settings.theme === "light") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function updateThemeUI() {
  const dark = isDarkMode();
  const icon = dark
    ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  
  const lbl = $("#themeLabel");
  if (lbl) lbl.textContent = dark ? "Mode terang" : "Mode gelap";
  
  $$(".theme-btn svg").forEach(s => (s.outerHTML = icon));
}

function toggleTheme() {
  const next = isDarkMode() ? "light" : "dark";
  applyTheme(next);
  toast(next === "dark" ? "Mode gelap aktif" : "Mode terang aktif");
}

/* ================= MESIN AI ================= */
const ERR = {
  nokey: "Belum ada API key. Buka menu Kunci API dan tempel API key kamu.",
  401: "API key ditolak. Periksa kembali di menu Kunci API.",
  402: "Kredit OpenRouter habis. Isi kredit atau gunakan model gratis.",
  429: "Terlalu banyak permintaan (rate limit). Tunggu beberapa saat lalu coba lagi.",
  network: "Tidak bisa terhubung ke server AI. Periksa koneksi internet.",
  not_granted: "Izin memakai Claude di pratinjau ini ditolak.",
  rate_limited: "Batas pemakaian sementara tercapai. Coba lagi nanti.",
};
const errMsg = e => (e && (e.message || ERR[e.code] || ERR[e.status])) || "Terjadi kesalahan. Coba lagi.";

async function callOpenRouter({ system, messages, model, onText, signal }) {
  const body = {
    model: model || S.settings.model,
    messages: [...(system ? [{ role: "system", content: system }] : []), ...messages],
    stream: true,
  };
  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", signal,
      headers: {
        "Authorization": "Bearer " + S.settings.key,
        "Content-Type": "application/json",
        "X-Title": "far-agent",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e && e.name === "AbortError") throw { code: "cancelled" };
    throw { code: "network" };
  }
  if (!res.ok) {
    let m = ""; try { const j = await res.json(); m = j.error?.message || ""; } catch {}
    throw { code: res.status, status: res.status, message: ERR[res.status] || ("OpenRouter: " + (m || res.statusText)) };
  }
  const reader = res.body.getReader(); const dec = new TextDecoder();
  let buf = "", text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (d === "[DONE]") continue;
        let j; try { j = JSON.parse(d); } catch { continue; }
        if (j.error) throw { code: "api", message: "OpenRouter: " + (j.error.message || "galat") };
        const delta = j.choices?.[0]?.delta?.content || "";
        if (delta) { text += delta; onText && onText(text); }
      }
    }
  } catch (e) {
    if (e && e.name === "AbortError") throw { code: "cancelled", text };
    throw e;
  }
  if (!text.trim()) throw { code: "empty", message: "Model tidak mengembalikan jawaban. Coba model lain." };
  return text;
}

async function callSample(sample, { system, messages, onText, signal, tier }) {
  const turns = [];
  if (system) turns.push({ role: "user", content: "Instruksi untuk seluruh percakapan:\n" + system });
  messages.forEach(m => turns.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content || "-" }));
  if (turns[turns.length - 1].role !== "user") turns.push({ role: "user", content: "Lanjutkan." });
  try {
    const r = await sample(turns, { onText: ({ text }) => onText && onText(text), signal, cache: false, modelTier: tier || "default" });
    return r.text;
  } catch (e) {
    if (e && e.code === "cancelled") throw { code: "cancelled", text: e.text };
    throw { code: e?.code, message: ERR[e?.code] || e?.message, text: e?.text };
  }
}

/* ---------- Google Gemini API (Google AI Studio) ---------- */
const isGem = () => S.settings.provider === "gemini";
const gemKeys = () => (S.settings.gkeys || []).map(k => k.trim()).filter(Boolean);
const hasKey = () => (isGem() ? gemKeys().length > 0 : !!S.settings.key);
const defModel = () => (isGem() ? S.settings.gmodel : S.settings.model);
const fitModel = m => (isGem() ? (m && !m.includes("/") ? m : S.settings.gmodel) : (m && m.includes("/") ? m : S.settings.model));
const curModels = () => (isGem() ? S.gemModels : S.models);
let gIdx = 0;

function gemErr(status, m, ki) {
  if (status === 429) return { code: "g429", message: "Semua key Gemini terkena batas kuota. Tunggu beberapa menit atau gunakan model Flash yang lebih hemat." };
  if (status === 400 && /api.?key/i.test(m)) return { message: `Key Gemini ${ki + 1} tidak valid. Periksa lagi di menu Kunci API.` };
  if (status === 403) return { message: `Key Gemini ${ki + 1} ditolak (403). Pastikan Generative Language API aktif di Google Cloud.` };
  if (status === 404) return { message: "Model ini tidak tersedia untuk API key kamu. Pilih model lain di menu Kunci API." };
  if (status === 503) return { message: "Server Gemini sedang sibuk. Coba sebentar lagi." };
  return { message: "Gemini: " + (m || "galat " + status) };
}

async function callGemini({ system, messages, model, onText, signal }) {
  const keys = gemKeys();
  if (!keys.length) throw { code: "nokey" };
  const contents = messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content || "-" }] }));
  const body = JSON.stringify({ contents, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}) });
  let lastErr = null;
  for (let n = 0; n < keys.length; n++) {
    const ki = (gIdx + n) % keys.length;
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
        method: "POST", signal, body,
        headers: { "Content-Type": "application/json", "x-goog-api-key": keys[ki] },
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw { code: "network", message: "Tidak bisa terhubung ke Gemini API. Periksa koneksi internet." };
    }
    if (!res.ok) {
      let m = ""; try { const j = await res.json(); m = j.error?.message || ""; } catch {}
      lastErr = gemErr(res.status, m, ki);
      const rotate = res.status === 429 || res.status === 403 || res.status === 503 || (res.status === 400 && /api.?key/i.test(m));
      if (rotate && n < keys.length - 1) {
        toast(`Key ${ki + 1} dialihkan (${res.status === 429 ? "kuota habis" : "kendala"}), mencoba key berikutnya...`);
        continue;
      }
      throw lastErr;
    }
    gIdx = ki;
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = "", text = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          let j; try { j = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (j.error) throw { message: "Gemini: " + (j.error.message || "galat") };
          if (j.promptFeedback?.blockReason) throw { message: "Gemini menolak permintaan ini (" + j.promptFeedback.blockReason + "). Ubah kalimatnya lalu coba lagi." };
          for (const p of j.candidates?.[0]?.content?.parts || []) {
            if (p.text && !p.thought) { text += p.text; onText && onText(text); }
          }
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled", text };
      throw e;
    }
    if (!text.trim()) throw { message: "Gemini tidak mengembalikan jawaban. Coba lagi atau pilih model lain." };
    return text;
  }
  throw lastErr || { code: "nokey" };
}

async function callAI(o) {
  o = Object.assign({}, o, { model: fitModel(o.model) });
  if (hasKey()) {
    try {
      return await (isGem() ? callGemini(o) : callOpenRouter(o));
    } catch (e) {
      if (e && e.code === "network") {
        const s = await getCap("sample");
        if (s) {
          toast((isGem() ? "Gemini API" : "OpenRouter") + " dialihkan ke Claude lokal untuk sementara.");
          return callSample(s, o);
        }
      }
      throw e;
    }
  }
  const s = await getCap("sample");
  if (s) return callSample(s, o);
  throw { code: "nokey", message: isGem() ? "Belum ada API key Gemini. Buka menu Kunci API dan tempel key Google AI Studio kamu." : ERR.nokey };
}

function parseJSON(t) {
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = f ? f[1] : t;
  try { return JSON.parse(src); } catch {}
  const a = src.indexOf("{"), b = src.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(src.slice(a, b + 1)); } catch {} }
  return null;
}

async function updateEngine() {
  const dot = $("#engineDot"), name = $("#engineName"), mod = $("#engineModel");
  if (!dot || !name || !mod) return;
  if (hasKey()) {
    dot.className = "dot ok pulse";
    name.textContent = isGem() ? `Gemini · ${gemKeys().length} key aktif` : "OpenRouter Terhubung";
    mod.textContent = defModel();
    return;
  }
  dot.className = "dot"; name.textContent = "Memeriksa…"; mod.textContent = "";
  const s = await getCap("sample");
  if (hasKey()) return updateEngine();
  if (s) {
    dot.className = "dot warn"; name.textContent = "Mode Sandbox Claude"; mod.textContent = "dijawab tanpa key eksternal";
  } else {
    dot.className = "dot bad"; name.textContent = "API Key Belum Ada"; mod.textContent = "Klik untuk mengatur";
  }
}

/* ---------- MODEL SELECTION & OPTIONS ---------- */
const isFree = m => m.inP === 0 && m.outP === 0;
const modelName = id => ([...S.gemModels, ...S.models].find(m => m.id === id) || {}).name || id;

function modelOptions(selected) {
  const sel = fitModel(selected);
  if (isGem()) {
    const list = S.gemModels;
    const opt = m => `<option value="${esc(m.id)}"${m.id === sel ? " selected" : ""}>${esc(m.name)}${m.tag ? " — " + esc(m.tag) : ""}</option>`;
    const pro = list.filter(m => /pro|ultra/i.test(m.id)), fast = list.filter(m => !/pro|ultra/i.test(m.id));
    let h = list.some(m => m.id === sel) ? "" : `<option value="${esc(sel)}" selected>${esc(sel)}</option>`;
    if (fast.length) h += `<optgroup label="Flash (Cepat, Hemat Kuota)">${fast.map(opt).join("")}</optgroup>`;
    if (pro.length) h += `<optgroup label="Pro & Penalaran Tinggi">${pro.map(opt).join("")}</optgroup>`;
    return h;
  }
  const known = new Set(FALLBACK_MODELS.map(m => m.id));
  const pop = S.models.filter(m => known.has(m.id));
  const free = S.models.filter(isFree);
  const rest = S.models.filter(m => !known.has(m.id) && !isFree(m)).sort((a, b) => a.name.localeCompare(b.name));
  const opt = m => `<option value="${esc(m.id)}"${m.id === sel ? " selected" : ""}>${esc(m.name)}</option>`;
  let h = "";
  if (!S.models.some(m => m.id === sel)) h += `<option value="${esc(sel)}" selected>${esc(sel)}</option>`;
  if (pop.length) h += `<optgroup label="Populer untuk Coding">${pop.map(opt).join("")}</optgroup>`;
  if (free.length) h += `<optgroup label="Gratis">${free.map(opt).join("")}</optgroup>`;
  if (rest.length) h += `<optgroup label="Semua Model">${rest.map(opt).join("")}</optgroup>`;
  return h;
}

async function refreshGemModels(manual) {
  const key = gemKeys()[0];
  if (!key) { if (manual) toast("Masukkan minimal satu key Gemini terlebih dahulu.", true); return false; }
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", { headers: { "x-goog-api-key": key } });
    if (!r.ok) throw 0;
    const j = await r.json();
    const tags = Object.fromEntries(GEMINI_FALLBACK.map(m => [m.id, m.tag]));
    const list = (j.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes("generateContent") && /gemini/i.test(m.name) && !/(embed|image|tts|audio|live|robotics|computer-use)/i.test(m.name))
      .map(m => { const id = m.name.replace(/^models\//, ""); return { id, name: m.displayName || id, ctx: m.inputTokenLimit || 0, tag: tags[id] || "" }; });
    if (list.length) {
      S.gemModels = list; S.gemFetched = Date.now();
      LS.set("gmodels", list); LS.set("gmodelsAt", S.gemFetched);
      if (manual) toast(`${list.length} model Gemini berhasil disinkronisasi.`);
      return true;
    }
  } catch {}
  if (manual) toast("Gagal memperbarui daftar model. Menggunakan daftar bawaan.", true);
  return false;
}

async function refreshModels(manual) {
  if (isGem()) return refreshGemModels(manual);
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models");
    if (!r.ok) throw 0;
    const j = await r.json();
    const list = (j.data || []).map(m => ({
      id: m.id, name: (m.name || m.id).replace(/^[^:]+:\s*/, ""),
      inP: +(+m.pricing?.prompt * 1e6).toFixed(3) || 0,
      outP: +(+m.pricing?.completion * 1e6).toFixed(3) || 0,
      ctx: m.context_length || 0,
    })).filter(m => m.id && !(m.inP < 0));
    if (list.length) {
      S.models = list; S.modelsFetched = Date.now();
      LS.set("models", list); LS.set("modelsAt", S.modelsFetched);
      if (manual) toast(`${list.length} model OpenRouter berhasil disinkronisasi.`);
      return true;
    }
  } catch {}
  if (manual) toast("Gagal memuat daftar model OpenRouter. Menggunakan daftar bawaan.", true);
  return false;
}

/* ================= ROUTER ================= */
const ROUTES = ["beranda", "rencana", "chat", "desain", "template", "pengaturan"];
let activeCtl = null;

function route() {
  const r = (location.hash || "#beranda").slice(1);
  const name = ROUTES.includes(r) ? r : "beranda";
  $$("#nav a").forEach(a => {
    if (a.dataset.route === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const main = $("#main");
  main.scrollTop = 0;
  ({
    beranda: viewHome,
    rencana: viewPlan,
    chat: viewChat,
    desain: viewDesign,
    template: viewTemplates,
    pengaturan: viewSettings
  })[name](main);
  updateNavBadges();
}

/* ================= 01. BERANDA (HOME VIEW) ================= */
function viewHome(main) {
  const recents = [
    ...S.plans.map(p => ({ k: "Rencana", t: p.title || "Tanpa judul", at: p.created, href: "#rencana", act: () => (planUI.openId = p.id), ex: p.example })),
    ...S.chats.map(c => ({ k: "Chat", t: c.title || "Chat baru", at: c.updated, href: "#chat", act: () => (chatUI.id = c.id) })),
    ...S.designs.map(d => ({ k: "Desain", t: d.title, at: d.updated, href: "#desain", act: () => (designUI.id = d.id) })),
  ].sort((a, b) => b.at - a.at).slice(0, 6);

  main.innerHTML = `<div class="view">
    <section class="hero">
      <div class="panel hero-main">
        <svg class="hero-arc" viewBox="0 0 220 220" aria-hidden="true">
          <g fill="none" stroke="var(--line-strong)" stroke-width="1.5">
            <circle cx="220" cy="0" r="60"/>
            <circle cx="220" cy="0" r="110"/>
            <circle cx="220" cy="0" r="160"/>
            <circle cx="220" cy="0" r="210"/>
          </g>
        </svg>
        <span class="eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Workspace AI Coding Agent
        </span>
        <h1>Ide masuk, <em>rencana siap</em> dibangun oleh agent.</h1>
        <p class="lede">Jelaskan ide aplikasimu. far-agent akan menyusun PRD, spesifikasi arsitektur teknis, task checklist bertahap, dan rules file untuk Claude Code, Cursor, Windsurf, atau Codex.</p>
        
        <div class="field">
          <label for="homeIdea">Ceritakan ide aplikasimu</label>
          <textarea id="homeIdea" rows="3" placeholder="Contoh: Aplikasi kasir online warung kopi dengan pencatatan penjualan, laporan laba harian, dan struk via WhatsApp..."></textarea>
        </div>

        <div class="quick-ideas">
          <span class="lbl">Inspirasi cepat:</span>
          ${QUICK_INSPIRATIONS.map(q => `<button type="button" class="quick-btn" title="Gunakan inspirasi ini">${esc(q.split(":")[0])}</button>`).join("")}
        </div>

        <div class="row" style="margin-top:6px">
          <button class="btn primary" id="homeGo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Susun Rencana Proyek
          </button>
          <span class="hint">Tekan <b>Ctrl+Enter</b> untuk langsung mulai.</span>
        </div>
      </div>

      <aside class="panel hero-side">
        <span class="eyebrow">Alur Kerja Cerdas</span>
        <ol class="flow">
          <li><div><b>1. Tulis Ide Inti</b><span>Tentukan platform, tingkat pengalaman, dan target AI agent.</span></div></li>
          <li><div><b>2. Interview Interaktif AI</b><span>AI menganalisis hal yang belum jelas dengan opsi pilihan ganda.</span></div></li>
          <li><div><b>3. Hasilkan 5 Dokumen</b><span>PRD.md, SPEC.md, TASKS.md, Rules file, dan Prompt pembuka.</span></div></li>
          <li><div><b>4. Eksekusi Per Task</b><span>Jalankan satu task per sesi agent untuk menghemat token dan cegah halusinasi.</span></div></li>
        </ol>
      </aside>
    </section>

    <section class="tools">
      ${toolCard("#rencana", "Bikin Rencana", "Dari ide mentah jadi PRD, SPEC, dan task bertahap siap pakai.", '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>')}
      ${toolCard("#chat", "Chat Multi-Model", "Konsultasi arsitektur, review kode, dan debug pakai Gemini atau OpenRouter.", '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>')}
      ${toolCard("#desain", "Desain UI AI", "Rancang UI responsif langsung dari deskripsi dengan live preview iframe.", '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M8 21h8"/>')}
      ${toolCard("#template", "Template Codebase", "Boilerplate terverifikasi siap pakai lengkap dengan AGENTS.md dan aturan stack.", '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><path d="M16.5 13v7M13 16.5h7"/>')}
    </section>

    <section>
      <div class="section-title">
        <h2>Pekerjaan Terakhir</h2>
        ${recents.length ? `<span class="hint tnum">${recents.length} proyek aktif</span>` : ""}
      </div>
      ${recents.length ? `<div class="recent">${recents.map((r, i) => `
        <a class="panel" href="${r.href}" data-i="${i}">
          <span class="k">${r.k}${r.ex ? ' <span class="badge ex">Contoh</span>' : ""}</span>
          <b>${esc(r.t)}</b>
          <span class="hint">${fmtDate(r.at)}</span>
        </a>`).join("")}</div>`
        : `<div class="empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <b>Belum ada riwayat pekerjaan</b>
            <span class="hint">Mulai tulis ide aplikasimu pada kotak di atas atau jelajahi template codebase.</span>
          </div>`}
    </section>
  </div>`;

  const ta = $("#homeIdea");
  const go = () => {
    const v = ta.value.trim();
    if (!v) { ta.focus(); return toast("Tuliskan idemu terlebih dahulu (minimal 1 atau 2 kalimat)."); }
    S.pendingIdea = v; planUI.openId = null; planUI.step = 1; location.hash = "#rencana";
  };

  $("#homeGo").onclick = go;
  ta.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      go();
    }
  });

  $$(".quick-ideas button").forEach((b, i) => {
    b.onclick = () => {
      ta.value = QUICK_INSPIRATIONS[i];
      ta.focus();
    };
  });

  $$(".recent a").forEach(a => a.addEventListener("click", () => recents[+a.dataset.i].act()));
}

function toolCard(href, title, text, icon) {
  return `<a class="panel tool" href="${href}">
    <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>
    <h3>${title}</h3>
    <p>${text}</p>
    <span class="go">Buka sekarang →</span>
  </a>`;
}

/* ================= 02. RENCANA (PLAN VIEW) ================= */
const planUI = { openId: null, step: 1, draft: null, tab: "prd", running: false, editing: false, ctl: null };
const TYPES = ["Web app", "Website / landing page", "Aplikasi mobile", "API / backend", "Bot", "Ekstensi browser", "Lainnya"];
const LEVELS = ["Pemula", "Menengah", "Mahir"];

function docDefs(p) {
  return [
    { k: "prd", label: "PRD.md", file: "PRD.md" },
    { k: "spec", label: "SPEC.md", file: "SPEC.md" },
    { k: "tasks", label: "TASKS.md", file: "TASKS.md" },
    { k: "rules", label: (AGENTS[p.agent] || AGENTS["Codex / agent lain"]).file.split("/").pop(), file: (AGENTS[p.agent] || AGENTS["Codex / agent lain"]).file },
    { k: "kickoff", label: "Prompt Mulai", file: "PROMPT-MULAI.md" },
  ];
}

function newDraft() {
  return {
    id: uid(),
    created: Date.now(),
    title: "",
    idea: "",
    type: "Web app",
    agent: "Claude Code",
    level: "Pemula",
    lang: S.settings.lang,
    stack: "",
    model: defModel(),
    questions: [],
    docs: {},
  };
}

function currentPlan() {
  if (planUI.openId) return S.plans.find(p => p.id === planUI.openId) || null;
  return planUI.draft;
}

function storePlan(p) {
  const i = S.plans.findIndex(x => x.id === p.id);
  if (i >= 0) S.plans[i] = p; else S.plans.unshift(p);
  savePlans();
}

function viewPlan(main) {
  if (planUI.openId && !S.plans.find(p => p.id === planUI.openId)) planUI.openId = null;
  if (!planUI.openId && !planUI.draft) { planUI.draft = newDraft(); planUI.step = 1; }
  if (S.pendingIdea) { planUI.openId = null; planUI.draft = newDraft(); planUI.draft.idea = S.pendingIdea; planUI.step = 1; S.pendingIdea = ""; }
  if (S.pendingStack) { planUI.openId = null; planUI.draft = Object.assign(newDraft(), S.pendingStack); planUI.step = 1; S.pendingStack = null; }

  const p = currentPlan();
  if (planUI.openId) planUI.step = 3;
  const st = planUI.step;
  const stepState = n => (n < st ? "done" : n === st ? "now" : "");

  main.innerHTML = `<div class="view">
    <div class="view-head">
      <div>
        <span class="eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Rencana Proyek AI
        </span>
        <h1>${planUI.openId ? esc(p.title || "Tanpa judul") : "Susun Rencana Baru"}</h1>
        ${p.example ? '<p class="lede"><span class="badge ex">Contoh</span> Rencana ini dibuat sebagai gambaran hasil akhir arsitektur.</p>' : ""}
      </div>
      <div class="row">
        ${planUI.openId ? '<button class="btn primary" id="planNew">+ Rencana Baru</button>' : ""}
      </div>
    </div>

    <ol class="steps steps-wrap">
      <li data-state="${stepState(1)}"><b>01</b><span>1. Konsep &amp; Stack</span></li>
      <li data-state="${stepState(2)}"><b>02</b><span>2. Interview AI</span></li>
      <li data-state="${stepState(3)}"><b>03</b><span>3. Dokumen &amp; Eksekusi</span></li>
    </ol>

    <div class="plan-grid">
      <div id="planBody"></div>
      <aside class="panel card">
        <div class="section-title" style="margin:0">
          <h2 style="font-size:16px">Daftar Rencana</h2>
          <span class="hint tnum">${S.plans.length} tersimpan</span>
        </div>
        <div class="saved-list">
          ${S.plans.map(x => `
            <button data-id="${x.id}" style="${x.id === (p && p.id) ? "background:var(--surface-2);font-weight:600;" : ""}">
              <b>${esc(x.title || "Tanpa judul")}${x.example ? ' <span class="badge ex">Contoh</span>' : ""}</b>
              <span>${esc(x.type)} · ${fmtDate(x.created)}</span>
            </button>`).join("") || '<span class="hint">Belum ada rencana tersimpan.</span>'}
        </div>
      </aside>
    </div>
  </div>`;

  const nb = $("#planNew");
  if (nb) nb.onclick = () => { planUI.openId = null; planUI.draft = newDraft(); planUI.step = 1; viewPlan(main); };
  
  $$(".saved-list button").forEach(b => {
    b.onclick = () => {
      planUI.openId = b.dataset.id;
      planUI.tab = "prd";
      planUI.editing = false;
      viewPlan(main);
    };
  });

  const body = $("#planBody");
  if (st === 1) planStep1(body, p, main);
  else if (st === 2) planStep2(body, p, main);
  else planStep3(body, p, main);
}

function planStep1(body, p, main) {
  body.innerHTML = `<div class="panel card">
    <div class="field">
      <label for="pIdea">Ceritakan ide aplikasimu</label>
      <textarea id="pIdea" rows="5" placeholder="Jelaskan masalah apa yang ingin diselesaikan, siapa target penggunanya, dan fitur penting yang kamu bayangkan...">${esc(p.idea)}</textarea>
      <span class="hint">Semakin spesifik idemu, semakin tajam arsitektur teknis dan task list yang dihasilkan.</span>
    </div>

    <div class="field">
      <span class="label">Pilih AI Coding Agent Utama</span>
      <div class="agent-cards" id="pAgentCards">
        ${Object.entries(AGENTS).map(([k, v]) => `
          <div class="agent-card" data-agent="${k}" aria-pressed="${k === p.agent}">
            <b>${k}</b>
            <span>${v.file}</span>
          </div>`).join("")}
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label for="pType">Jenis Aplikasi</label>
        <select id="pType">${TYPES.map(t => `<option${t === p.type ? " selected" : ""}>${t}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label for="pStack">Teknologi / Stack (Opsional)</label>
        <input type="text" id="pStack" value="${esc(p.stack)}" placeholder="Contoh: Next.js + Supabase + Tailwind (kosongkan jika serahkan ke AI)">
      </div>
      <div class="field">
        <label for="pModel">Model AI Penyusun</label>
        <select id="pModel">${modelOptions(p.model)}</select>
      </div>
      <div class="field">
        <span class="label">Tingkat Pengalaman Coding</span>
        <div class="chips" id="pLevel">${LEVELS.map(l => `<button type="button" class="chip" aria-pressed="${l === p.level}">${l}</button>`).join("")}</div>
      </div>
    </div>

    <div class="field">
      <span class="label">Bahasa Dokumen</span>
      <div class="chips" id="pLang">${["Indonesia", "English"].map(l => `<button type="button" class="chip" aria-pressed="${l === p.lang}">${l}</button>`).join("")}</div>
    </div>

    <div class="row" style="justify-content:space-between;margin-top:8px">
      <button class="btn ghost" id="pSkip">Lewati interview, langsung buat dokumen</button>
      <button class="btn primary" id="pNext">Lanjut: Interview AI →</button>
    </div>
  </div>`;

  const collect = () => {
    p.idea = $("#pIdea").value.trim();
    p.type = $("#pType").value;
    p.stack = $("#pStack").value.trim();
    p.model = $("#pModel").value;
  };

  $$("#pAgentCards .agent-card").forEach(c => {
    c.onclick = () => {
      $$("#pAgentCards .agent-card").forEach(x => x.setAttribute("aria-pressed", "false"));
      c.setAttribute("aria-pressed", "true");
      p.agent = c.dataset.agent;
    };
  });

  const chipGroup = (id, key) => {
    $$("#" + id + " .chip").forEach(c => {
      c.onclick = () => {
        $$("#" + id + " .chip").forEach(x => x.setAttribute("aria-pressed", "false"));
        c.setAttribute("aria-pressed", "true");
        p[key] = c.textContent;
      };
    });
  };
  chipGroup("pLevel", "level");
  chipGroup("pLang", "lang");

  ["pIdea", "pType", "pStack", "pModel"].forEach(id => $("#" + id).addEventListener("change", collect));

  $("#pNext").onclick = async () => {
    collect();
    if (p.idea.length < 15) { $("#pIdea").focus(); return toast("Jelaskan ide aplikasimu sedikit lebih detail terlebih dahulu."); }
    planUI.step = 2; p.questions = []; viewPlan(main); askQuestions(p, main);
  };

  $("#pSkip").onclick = () => {
    collect();
    if (p.idea.length < 15) { $("#pIdea").focus(); return toast("Jelaskan ide aplikasimu sedikit lebih detail terlebih dahulu."); }
    p.questions = []; startDocs(p, main);
  };
}

function planContext(p) {
  const qa = (p.questions || []).filter(q => q.answer).map(q => `- ${q.question}\n  Jawaban: ${q.answer}`).join("\n");
  return `## Ide Proyek\n${p.idea}\n\n## Detail Konfigurasi\n- Nama proyek: ${p.title || "(belum ada, usulkan yang elegan)"}\n- Jenis aplikasi: ${p.type}\n- Level pengguna: ${p.level} ${p.level === "Pemula" ? "(pilih stack yang paling stabil, populer, dan mudah dipelajari)" : ""}\n- Stack yang diinginkan: ${p.stack || "Pilihkan teknologi terbaik, modern, dan scalable"}\n- AI coding agent yang dipakai: ${p.agent}\n- Konteks pasar: Indonesia (pertimbangkan mata uang IDR, payment gateway lokal seperti Midtrans/Xendit, dan integrasi WhatsApp bila relevan)${qa ? "\n\n## Jawaban Klarifikasi Pertanyaan:\n" + qa : ""}`;
}

async function askQuestions(p, main) {
  const box = $("#planBody");
  box.innerHTML = `<div class="panel card">
    <p class="thinking">AI sedang menganalisis ide proyekmu dan menyiapkan pertanyaan penajaman...</p>
    <div class="row"><button class="btn sm" id="qStop">Batalkan</button></div>
  </div>`;
  
  const ctl = new AbortController();
  activeCtl = ctl;
  $("#qStop").onclick = () => ctl.abort();

  try {
    const t = await callAI({
      model: p.model, signal: ctl.signal, tier: "default",
      system: "Kamu adalah Senior Principal Product Manager & Software Architect. Tugasmu membantu merencanakan spesifikasi teknis untuk dibangun dengan AI coding agent.",
      messages: [{
        role: "user",
        content: `${planContext(p)}\n\nBuat 5 pertanyaan klarifikasi PALING penting yang jawabannya akan mengubah isi PRD dan SPEC (fitur inti MVP, otentikasi pengguna, struktur database, payment/integrasi pihak ketiga, dan batasan). Untuk setiap pertanyaan beri 3 pilihan jawaban singkat yang realistis. Tulis dalam bahasa ${p.lang}. Usulkan juga nama proyek yang menarik.\n\nBalas HANYA JSON tanpa teks pengantar, format:\n{"title":"Nama Proyek","questions":[{"question":"...","why":"alasan teknis singkat","options":["...","...","..."]}]}`
      }],
    });
    const j = parseJSON(t);
    if (!j || !Array.isArray(j.questions)) throw { message: "Jawaban AI tidak dapat diparse. Silakan coba kembali." };
    if (!p.title && j.title) p.title = String(j.title).slice(0, 80);
    p.questions = j.questions.slice(0, 5).map(q => ({
      question: String(q.question || ""),
      why: String(q.why || ""),
      options: (q.options || []).map(String).slice(0, 4),
      answer: ""
    }));
    if (location.hash === "#rencana" && currentPlan() === p) viewPlan(main);
  } catch (e) {
    if (e.code === "cancelled") { planUI.step = 1; return location.hash === "#rencana" && viewPlan(main); }
    toast(errMsg(e), true);
    planUI.step = 1;
    if (location.hash === "#rencana") viewPlan(main);
  } finally {
    if (activeCtl === ctl) activeCtl = null;
  }
}

function planStep2(body, p, main) {
  if (!p.questions.length) return;
  const answeredCount = p.questions.filter(q => q.answer).length;

  body.innerHTML = `<div class="panel card">
    <div class="field">
      <label for="pTitle">Nama Proyek</label>
      <input type="text" id="pTitle" value="${esc(p.title)}" placeholder="Nama aplikasi">
    </div>

    <div class="row" style="justify-content:space-between">
      <span class="label" style="font-size:14px">Pertanyaan Penajaman AI</span>
      <span class="badge" id="qProgress">${answeredCount} dari ${p.questions.length} terjawab</span>
    </div>

    <div>${p.questions.map((q, i) => `
      <div class="q" data-i="${i}">
        <h4>${i + 1}. ${esc(q.question)}</h4>
        ${q.why ? `<span class="why">${esc(q.why)}</span>` : ""}
        <div class="chips">${q.options.map(o => `<button type="button" class="chip" aria-pressed="${q.answer === o}">${esc(o)}</button>`).join("")}</div>
        <input type="text" id="qa${i}" placeholder="Atau ketik jawabanmu sendiri..." value="${q.options.includes(q.answer) ? "" : esc(q.answer)}">
      </div>`).join("")}
    </div>

    <div class="row" style="justify-content:space-between;margin-top:12px">
      <div class="row">
        <button class="btn ghost" id="qBack">← Ubah Ide</button>
        <button class="btn ghost" id="qAgain">Tanya Ulang AI</button>
      </div>
      <button class="btn primary" id="qGo">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Hasilkan Dokumen Lengkap →
      </button>
    </div>
  </div>`;

  $("#pTitle").oninput = e => (p.title = e.target.value);

  const updateCounter = () => {
    const c = p.questions.filter(q => q.answer).length;
    const el = $("#qProgress");
    if (el) el.textContent = `${c} dari ${p.questions.length} terjawab`;
  };

  $$(".q").forEach(el => {
    const q = p.questions[+el.dataset.i];
    const chips = $$(".chip", el), inp = $("input", el);
    chips.forEach(c => {
      c.onclick = () => {
        const on = c.getAttribute("aria-pressed") !== "true";
        chips.forEach(x => x.setAttribute("aria-pressed", "false"));
        c.setAttribute("aria-pressed", String(on));
        q.answer = on ? c.textContent : "";
        if (on) inp.value = "";
        updateCounter();
      };
    });
    inp.oninput = () => {
      q.answer = inp.value.trim();
      chips.forEach(x => x.setAttribute("aria-pressed", "false"));
      updateCounter();
    };
  });

  $("#qBack").onclick = () => { planUI.step = 1; viewPlan(main); };
  $("#qAgain").onclick = () => { p.questions = []; viewPlan(main); askQuestions(p, main); };
  $("#qGo").onclick = () => startDocs(p, main);
}

function docPrompt(k, p, extra) {
  const ctx = planContext(p);
  const d = p.docs;
  const lang = `Tulis dalam bahasa ${p.lang}. Format Markdown rapi. Langsung isi dokumen tanpa basa-basi pengantar atau penutup.`;
  if (k === "prd") {
    return `${ctx}\n\nTulis PRD.md komprehensif untuk proyek ini dengan bagian:\n1. Ringkasan Eksekutif;\n2. Masalah & Solusi;\n3. Target Pengguna (tabel peran, persona, dan kebutuhan);\n4. Tujuan & Metrik Keberhasilan (KPI);\n5. Ruang Lingkup MVP (Must-Have);\n6. Di Luar MVP (Post-MVP);\n7. User Stories dengan Kriteria Penerimaan;\n8. Alur Pengguna Utama;\n9. Kebutuhan Non-Fungsional (Performa, Keamanan, Aksesibilitas);\n10. Risiko & Mitigasi. Fokus pada MVP yang realistis diselesaikan AI coding agent dalam beberapa hari. ${lang}`;
  }
  if (k === "spec") {
    return `${ctx}\n\n# PRD.md\n${d.prd}\n\nBerdasarkan PRD di atas, tulis SPEC.md teknis untuk arsitektur aplikasi dengan bagian:\n1. Tech Stack & Library (dengan alasan pemilihan);\n2. Struktur Folder Lengkap (blok kode tree);\n3. Skema Data & Model (tabel per entitas: kolom, tipe, relasi, index);\n4. Routes & Komponen Kunci;\n5. API Endpoints / Server Actions (Method, Path, Request, Response, Error);\n6. Autentikasi & Otorisasi (RLS/Permissions);\n7. Integrasi Pihak Ketiga (Payment Gateway, Webhook, WhatsApp);\n8. Variabel Lingkungan (.env);\n9. Error Handling & Logging;\n10. Strategi Pengujian (Testing). Gunakan library yang stabil dan mutakhir. ${lang}`;
  }
  if (k === "tasks") {
    return `${ctx}\n\n# PRD.md\n${d.prd}\n\n# SPEC.md\n${d.spec}\n\nPecah pekerjaan menjadi TASKS.md bertahap untuk AI coding agent. Kelompokkan per fase (## Fase 1: Fondasi, ## Fase 2: Fitur Inti, dst). Setiap task diberi heading "### T-001 Judul" (format nomor urut tiga digit). Di bawahnya sertakan:\n- **Tujuan** (1 kalimat jelas)\n- **File yang disentuh**\n- **Langkah pengerjaan** bernomor\n- **Kriteria selesai** berupa checklist "- [ ]"\n- **Ketergantungan** (Dependency).\nSetiap task harus atomic (dapat diselesaikan dalam satu sesi agent) dan berurutan dari fondasi hingga fungsional penuh. ${lang}`;
  }
  if (k === "rules") {
    const f = (AGENTS[p.agent] || AGENTS["Codex / agent lain"]).file;
    return `${ctx}\n\n# SPEC.md\n${d.spec}\n\nTulis file aturan kerja untuk agent ${p.agent} (${f}). Isi:\n- Ringkasan proyek 2-3 kalimat\n- Tech stack dan versi\n- Perintah penting (dev, build, lint, test)\n- Konvensi kode & struktur folder\n- Aturan keamanan & rahasia (.env)\n- Alur kerja per task (wajib baca TASKS.md, kerjakan 1 task per sesi, centang task selesai, jalankan lint/typecheck, lalu berhenti dan laporkan ringkasan)\n- Larangan keras (Do's & Don'ts).\nMaksimal sekitar 80 baris, padat, imperatif dan tegas.${p.agent === "Cursor" ? '\nAwali dengan frontmatter:\n---\ndescription: Aturan proyek\nalwaysApply: true\n---' : ""} ${lang}`;
  }
  return "";
}

function kickoff(p) {
  const rf = (AGENTS[p.agent] || AGENTS["Codex / agent lain"]).file;
  return `Kamu akan membangun proyek "${p.title || "aplikasi ini"}". Seluruh spesifikasi proyek sudah tersedia di root repository:\n\n- PRD.md: Dokumen ruang lingkup dan spesifikasi produk\n- SPEC.md: Keputusan teknis arsitektur, struktur folder, dan skema database\n- TASKS.md: Daftar task bertahap berurutan\n- ${rf}: Aturan kerja dan standar kode yang WAJIB ditaati\n\nLangkah pertama:\n1. Baca keempat file dokumen tersebut dengan saksama.\n2. Kerjakan hanya T-001 (Setup proyek) sampai seluruh checklist kriteria selesainya terpenuhi.\n3. Setelah selesai, tandai centang T-001 di TASKS.md.\n4. Jalankan perintah lint, typecheck, dan tes.\n5. Berhenti dan laporkan ringkasan: apa yang sudah dibuat, cara mengujinya, dan task berikutnya.`;
}

function taskList(p) {
  const out = [];
  const re = /^#{2,4}\s*(T-\d{2,4})\s*[:.\-–—]?\s*(.*)$/gm;
  let m;
  while ((m = re.exec(p.docs.tasks || ""))) {
    out.push({ id: m[1], title: m[2].trim() });
  }
  return out;
}

function nextTaskPrompt(p, t) {
  return `Lanjutkan pengerjaan ke task ${t.id}${t.title ? " — " + t.title : ""}.\n\nBuka kembali bagian ${t.id} di TASKS.md dan patuhi aturan di ${(AGENTS[p.agent] || AGENTS["Codex / agent lain"]).file}. Kerjakan HANYA task ini. Jangan mengubah file di luar cakupan task kecuali ada dependensi mutlak (dan jelaskan alasannya).\n\nSetelah selesai:\n1. Centang checklist ${t.id} di TASKS.md.\n2. Jalankan lint, typecheck, dan pengujian yang relevan.\n3. Berhenti dan laporkan apa yang sudah diselesaikan.`;
}

async function startDocs(p, main, only, instruction) {
  if (planUI.running) return toast("Masih ada dokumen yang sedang disusun AI.");
  if (!p.title) p.title = p.idea.split(/[.\n]/)[0].slice(0, 60);
  storePlan(p);
  planUI.openId = p.id;
  planUI.draft = null;
  planUI.step = 3;

  const order = only ? [only] : ["prd", "spec", "tasks", "rules"];
  if (!only) { p.docs = {}; planUI.tab = "prd"; }
  planUI.running = true;
  p._status = Object.assign({}, p._status || {});
  order.forEach(k => (p._status[k] = "wait"));

  const ctl = new AbortController();
  activeCtl = ctl;
  planUI.ctl = ctl;

  if (location.hash === "#rencana") viewPlan(main);

  try {
    for (const k of order) {
      p._status[k] = "run";
      refreshTabs(p);
      const prev = p.docs[k] || "";
      const content = instruction
        ? `${planContext(p)}\n\nIsi dokumen saat ini:\n\n${prev}\n\nUbah dokumen sesuai permintaan berikut, lalu tulis ulang dokumen LENGKAP. Bahasa ${p.lang}, format Markdown tanpa kalimat pengantar.\n\nPermintaan revisi: ${instruction}`
        : docPrompt(k, p);

      const s = streamTo(() => (location.hash === "#rencana" && planUI.tab === k && currentPlan() === p && !planUI.editing ? $("#docOut") : null));
      if (location.hash === "#rencana" && planUI.tab === k) {
        const el = $("#docOut");
        if (el) el.innerHTML = '<p class="thinking">Menulis ' + k.toUpperCase() + '...</p>';
      }

      const text = await callAI({
        model: p.model, signal: ctl.signal, tier: "default",
        system: `Kamu adalah Senior Technical Product Manager dan Principal Architect yang menulis spesifikasi untuk AI coding agent (${p.agent}). Tulisanmu konkret, presisi, dan siap dieksekusi mesin.`,
        messages: [{ role: "user", content }],
        onText: t => { p.docs[k] = t; s.push(t); updateDocMeta(p); },
      });

      p.docs[k] = text.replace(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/, "$1");
      s.end(p.docs[k]);
      p._status[k] = "done";
      storePlan(p);
      refreshTabs(p);
      updateDocMeta(p);
    }
    toast(only ? "Dokumen berhasil diperbarui." : "Semua dokumen selesai disusun! Buka tab 'Prompt Mulai' untuk memulai.");
  } catch (e) {
    if (e.code !== "cancelled") toast(errMsg(e), true);
    for (const k of order) if (p._status[k] !== "done") p._status[k] = p.docs[k] ? "done" : "";
    storePlan(p);
  } finally {
    planUI.running = false;
    planUI.ctl = null;
    if (activeCtl === ctl) activeCtl = null;
    if (location.hash === "#rencana" && currentPlan() === p) viewPlan(main);
  }
}

function refreshTabs(p) {
  $$("#docTabs button").forEach(b => {
    const st = p._status?.[b.dataset.k];
    const dot = $(".st", b);
    if (!dot) return;
    dot.className = "st" + (st === "run" ? " run" : (p.docs[b.dataset.k] || b.dataset.k === "kickoff") ? " done" : "");
  });
}

function updateDocMeta(p) {
  const el = $("#docMeta");
  if (!el) return;
  const k = planUI.tab;
  const t = k === "kickoff" ? kickoff(p) : (p.docs[k] || "");
  el.textContent = `${t.split("\n").length} baris · ≈${fmtTok(tokEst(t))} token`;
}

function planStep3(body, p, main) {
  const defs = docDefs(p);
  if (!defs.some(d => d.k === planUI.tab)) planUI.tab = "prd";
  const d = defs.find(x => x.k === planUI.tab);
  const text = d.k === "kickoff" ? kickoff(p) : (p.docs[d.k] || "");
  const tasks = taskList(p);

  body.innerHTML = `<div class="panel card" style="gap:0;padding:0;overflow:hidden">
    <div class="tabs" id="docTabs" role="tablist">
      ${defs.map(x => `
        <button role="tab" data-k="${x.k}" aria-selected="${x.k === planUI.tab}">
          <i class="st"></i>${esc(x.label)}
        </button>`).join("")}
    </div>

    <div class="doc-bar">
      <span class="meta tnum" id="docMeta"></span>
      <div class="row">
        ${planUI.running ? '<button class="btn sm danger" id="docStop"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> Hentikan</button>' : ""}
        ${d.k !== "kickoff" && text && !planUI.running ? `<button class="btn sm ghost" id="docEdit">${planUI.editing ? "Selesai Edit" : "Edit Teks"}</button>` : ""}
        <button class="btn sm" id="docCopy"${text ? "" : " disabled"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Salin
        </button>
        <button class="btn sm" id="docDl"${text ? "" : " disabled"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Unduh .md
        </button>
        <button class="btn sm primary" id="docZip"${p.docs.prd && !planUI.running ? "" : " disabled"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg> Unduh Semua (.zip)
        </button>
      </div>
    </div>

    ${planUI.editing && d.k !== "kickoff"
      ? `<textarea id="docEditor" rows="22" style="font-family:var(--font-mono);font-size:13.5px;padding:16px;border:0;border-radius:0;">${esc(text)}</textarea>`
      : `<div class="doc-out md" id="docOut">${text ? "" : (planUI.running ? '<p class="thinking">Menunggu giliran penyusunan...</p>' : '<div class="empty">Dokumen ini belum disusun. <button class="btn sm primary" id="docGen">Buat Sekarang</button></div>')}</div>`}

    ${d.k === "kickoff" ? `
      <div class="task-box">
        <div class="task-head">
          <span class="label" style="font-size:13.5px">Eksekutor Task Berikutnya</span>
          <span class="hint tnum">${tasks.length} task terdaftar</span>
        </div>
        ${tasks.length ? `
          <div class="next-task">
            <select id="taskSel">${tasks.map(t => `<option value="${t.id}">${esc(t.id + " — " + t.title)}</option>`).join("")}</select>
            <button class="btn primary" id="taskCopy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Salin Prompt Task Ini
            </button>
          </div>
          <span class="hint">Kirim prompt task ini ke AI coding agent kamu setelah task sebelumnya selesai dan lulus tes. Menjalankan 1 task per sesi sangat menghemat token!</span>
        ` : '<span class="hint">Buat dokumen TASKS.md terlebih dahulu untuk mengaktifkan pemilih task otomatis.</span>'}
      </div>`
      : (text && !planUI.running ? `
        <div class="refine">
          <input type="text" id="refineIn" placeholder="Minta perubahan, contoh: Tambahkan OAuth Google, gunakan Postgres daripada SQLite, perketat security">
          <button class="btn primary" id="refineGo">Perbarui dengan AI</button>
        </div>` : "")}
  </div>`;

  refreshTabs(p);
  updateDocMeta(p);

  const out = $("#docOut");
  if (out && text) {
    if (d.k === "kickoff") {
      out.innerHTML = "<pre><code>" + esc(text) + "</code></pre>";
    } else {
      out.innerHTML = md(text);
      if (planUI.running && p._status?.[d.k] === "run") out.classList.add("caret");
    }
    enhance(out);

    // Interactive Task Checklist support in TASKS view!
    if (d.k === "tasks") {
      const cbs = $$("input[type='checkbox']", out);
      cbs.forEach((cb, idx) => {
        cb.removeAttribute("disabled");
        cb.style.cursor = "pointer";
        cb.onchange = () => {
          let count = 0;
          p.docs.tasks = p.docs.tasks.replace(/- \[( |x)\]/g, match => {
            if (count === idx) {
              count++;
              return cb.checked ? "- [x]" : "- [ ]";
            }
            count++;
            return match;
          });
          storePlan(p);
          toast(cb.checked ? "Task ditandai selesai!" : "Task dibuka kembali");
        };
      });
    }
  }

  $$("#docTabs button").forEach(b => {
    b.onclick = () => {
      planUI.tab = b.dataset.k;
      planUI.editing = false;
      planStep3(body, p, main);
    };
  });

  const ed = $("#docEditor");
  if (ed) ed.oninput = () => { p.docs[d.k] = ed.value; storePlan(p); updateDocMeta(p); };

  const on = (id, fn) => { const el = $("#" + id); if (el) el.onclick = fn; };
  on("docStop", () => planUI.ctl && planUI.ctl.abort());
  on("docEdit", () => { planUI.editing = !planUI.editing; planStep3(body, p, main); });
  on("docCopy", e => copyText(d.k === "kickoff" ? kickoff(p) : p.docs[d.k], e.currentTarget));
  on("docDl", () => saveFile(d.file.split("/").pop(), d.k === "kickoff" ? kickoff(p) : p.docs[d.k]));
  on("docZip", () => {
    const files = {};
    defs.forEach(x => { const c = x.k === "kickoff" ? kickoff(p) : p.docs[x.k]; if (c) files[x.file] = c; });
    saveZip(slug(p.title) + "-arsitektur.zip", files);
  });
  on("docGen", () => startDocs(p, main, d.k));
  on("refineGo", () => {
    const v = $("#refineIn").value.trim();
    if (!v) return $("#refineIn").focus();
    startDocs(p, main, d.k, v);
  });
  const ri = $("#refineIn");
  if (ri) ri.onkeydown = e => { if (e.key === "Enter") $("#refineGo").click(); };
  on("taskCopy", e => {
    const t = tasks.find(x => x.id === $("#taskSel").value);
    if (t) copyText(nextTaskPrompt(p, t), e.currentTarget);
  });
}

/* ================= 03. CHAT AI MULTI-MODEL ================= */
const chatUI = { id: null, running: false, ctl: null };
const STARTERS = [
  "Bandingkan kelebihan Supabase vs PocketBase untuk aplikasi kasir UMKM",
  "Review struktur folder Next.js App Router ini dan beri rekomendasi best practice",
  "Jelaskan cara verifikasi signature webhook Midtrans agar transaksi tidak disusupi",
  "Tuliskan prompt spesifik untuk Claude Code agar membuat fitur auth dengan Google",
];

function getChat() { return S.chats.find(c => c.id === chatUI.id) || null; }

function viewChat(main) {
  let c = getChat();
  if (!c && S.chats.length && chatUI.id !== "new") { c = S.chats[0]; chatUI.id = c.id; }
  const model = c ? c.model : defModel();
  const persona = c ? c.persona : "umum";

  main.innerHTML = `<div class="view" style="max-width:1280px">
    <div class="view-head">
      <div>
        <span class="eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat Multi-Model
        </span>
        <h1>Diskusi Arsitektur &amp; Koding</h1>
      </div>
    </div>

    <div class="chat-wrap">
      <aside class="panel convos">
        <button class="btn primary" id="chatNew">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          + Chat Baru
        </button>
        <div class="convos-list">
          ${S.chats.map(x => `
            <button data-id="${x.id}" aria-current="${x.id === chatUI.id}">
              ${esc(x.title || "Chat baru")}
            </button>`).join("") || '<span class="hint" style="padding:12px;text-align:center">Riwayat percakapan akan tersimpan di sini.</span>'}
        </div>
      </aside>

      <section class="panel chat">
        <div class="chat-top">
          <div class="row">
            <select id="chatModel" title="Pilih Model AI">${modelOptions(model)}</select>
            <select id="chatPersona" title="Pilih Peran AI">${Object.entries(CHAT_PERSONAS).map(([k, v]) => `<option value="${k}"${k === persona ? " selected" : ""}>${v.label}</option>`).join("")}</select>
          </div>
          <span style="flex:1"></span>
          ${c && c.messages.length ? `
            <button class="btn sm ghost" id="chatToPlan" title="Konversi obrolan ini jadi ide proyek di Rencana">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              Jadikan Rencana
            </button>
            <button class="btn sm ghost danger" id="chatDel" title="Hapus chat ini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Hapus
            </button>` : ""}
        </div>

        <div class="msgs" id="msgs"></div>

        <div class="composer">
          <textarea id="chatIn" rows="1" placeholder="Tulis pertanyaanmu... (Enter kirim, Shift+Enter baris baru)"></textarea>
          <button class="btn primary" id="chatSend">
            ${chatUI.running ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> Berhenti`
              : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Kirim`}
          </button>
        </div>
      </section>
    </div>
  </div>`;

  renderMsgs(c);

  $("#chatNew").onclick = () => { chatUI.id = "new"; viewChat(main); $("#chatIn").focus(); };
  $$(".convos-list button").forEach(b => b.onclick = () => { chatUI.id = b.dataset.id; viewChat(main); });
  $("#chatModel").onchange = e => { const x = getChat(); if (x) { x.model = e.target.value; saveChats(); } };
  $("#chatPersona").onchange = e => { const x = getChat(); if (x) { x.persona = e.target.value; saveChats(); } };

  const del = $("#chatDel");
  if (del) del.onclick = () => {
    if (del.dataset.armed) {
      S.chats = S.chats.filter(x => x.id !== chatUI.id);
      chatUI.id = null;
      saveChats();
      viewChat(main);
      toast("Percakapan dihapus.");
      return;
    }
    del.dataset.armed = "1";
    del.textContent = "Yakin Hapus?";
    setTimeout(() => { if (del.isConnected) { del.textContent = "Hapus"; delete del.dataset.armed; } }, 3000);
  };

  const tp = $("#chatToPlan");
  if (tp) tp.onclick = () => {
    const x = getChat();
    const conv = x.messages.slice(-8).map(m => (m.role === "user" ? "Pengguna: " : "AI: ") + m.content).join("\n\n").slice(-3500);
    S.pendingIdea = "Rangkum diskusi ini menjadi ide arsitektur aplikasi:\n\n" + conv;
    location.hash = "#rencana";
  };

  const inp = $("#chatIn");
  inp.addEventListener("input", () => {
    inp.style.height = "auto";
    inp.style.height = Math.min(inp.scrollHeight, 200) + "px";
  });
  inp.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      $("#chatSend").click();
    }
  });

  $("#chatSend").onclick = () => {
    if (chatUI.running) { chatUI.ctl && chatUI.ctl.abort(); return; }
    sendChat(main, inp.value.trim());
  };
}

function msgHTML(m, i) {
  const ai = m.role === "assistant";
  return `<div class="msg ${ai ? "ai" : "user"}" data-i="${i}">
    <span class="av">${ai ? "AI" : "ME"}</span>
    <div style="min-width:0;flex:1">
      <div class="who">${ai ? esc(modelName(m.model || "")) : "Kamu"}</div>
      <div class="body ${ai ? "md" : ""}">${ai ? md(m.content) : esc(m.content)}</div>
      ${ai && m.content ? `
        <div class="row" style="margin-top:6px">
          <button class="btn sm ghost" data-copy="${i}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Salin Jawaban
          </button>
        </div>` : ""}
    </div>
  </div>`;
}

function renderMsgs(c) {
  const box = $("#msgs");
  if (!box) return;
  if (!c || !c.messages.length) {
    box.innerHTML = `<div style="margin:auto 0;display:flex;flex-direction:column;gap:16px;max-width:720px">
      <p class="hint" style="font-size:14px">Pilih peran dan model AI di atas, lalu tanyakan hal apa pun seputar koding. Atau pilih salah satu topik pembuka berikut:</p>
      <div class="starter">
        ${STARTERS.map(s => `<button type="button">${esc(s)}</button>`).join("")}
      </div>
    </div>`;
    $$(".starter button", box).forEach(b => {
      b.onclick = () => {
        const inp = $("#chatIn");
        inp.value = b.textContent;
        inp.focus();
      };
    });
    return;
  }
  box.innerHTML = c.messages.map(msgHTML).join("");
  $$(".md", box).forEach(enhance);
  $$("[data-copy]", box).forEach(b => b.onclick = () => copyText(c.messages[+b.dataset.copy].content, b));
  box.scrollTop = box.scrollHeight;
}

async function sendChat(main, text) {
  if (!text) return;
  let c = getChat();
  if (!c) {
    c = {
      id: uid(),
      title: text.slice(0, 48),
      model: $("#chatModel").value,
      persona: $("#chatPersona").value,
      messages: [],
      updated: Date.now()
    };
    S.chats.unshift(c);
    chatUI.id = c.id;
  }
  c.model = $("#chatModel").value;
  c.persona = $("#chatPersona").value;
  c.messages.push({ role: "user", content: text });
  const ai = { role: "assistant", content: "", model: c.model };
  c.messages.push(ai);
  c.updated = Date.now();
  saveChats();

  chatUI.running = true;
  const ctl = new AbortController();
  chatUI.ctl = ctl;
  viewChat(main);

  const idx = c.messages.length - 1;
  const bodyEl = () => (location.hash === "#chat" && chatUI.id === c.id ? $(`.msg[data-i="${idx}"] .body`) : null);
  const b0 = bodyEl();
  if (b0) b0.innerHTML = '<p class="thinking">Berpikir...</p>';
  const s = streamTo(bodyEl);

  try {
    const hist = c.messages.slice(0, -1).slice(-24).map(m => ({ role: m.role, content: m.content }));
    const out = await callAI({
      model: c.model,
      system: CHAT_PERSONAS[c.persona].sys,
      messages: hist,
      signal: ctl.signal,
      tier: "default",
      onText: t => {
        ai.content = t;
        s.push(t);
        const box = $("#msgs");
        if (box) box.scrollTop = box.scrollHeight;
      }
    });
    ai.content = out;
  } catch (e) {
    if (e.text) ai.content = e.text;
    if (e.code !== "cancelled") {
      toast(errMsg(e), true);
      if (!ai.content) ai.content = "_Gagal memproses jawaban: " + errMsg(e) + "_";
    } else if (!ai.content) {
      ai.content = "_Percakapan dihentikan oleh pengguna._";
    }
  } finally {
    c.updated = Date.now();
    saveChats();
    chatUI.running = false;
    chatUI.ctl = null;
    if (location.hash === "#chat") viewChat(main);
  }
}

/* ================= 04. DESAIN UI (AI SANDBOX) ================= */
const designUI = { id: null, device: "desktop", mode: "preview", running: false, ctl: null, style: DESIGN_STYLES[0], live: "", draft: "" };

function getDesign() { return S.designs.find(d => d.id === designUI.id) || null; }

function extractHTML(t) {
  const f = t.match(/```(?:html)?\s*\n?([\s\S]*?)(```|$)/i);
  let h = f ? f[1] : t;
  const i = h.search(/<!doctype html|<html/i);
  if (i > 0) h = h.slice(i);
  return h.trim();
}

function viewDesign(main) {
  const d = getDesign();
  const v = d ? d.versions[d.cur] : null;

  main.innerHTML = `<div class="view" style="max-width:1340px">
    <div class="view-head">
      <div>
        <span class="eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          AI UI Sandbox &amp; Studio
        </span>
        <h1>${d ? esc(d.title) : "Desain Halaman dari Teks"}</h1>
      </div>
      <div class="row">
        ${d ? '<button class="btn primary" id="dNew">+ Desain Baru</button>' : ""}
      </div>
    </div>

    <div class="design-wrap">
      <aside class="panel card">
        ${d ? `
          <div class="field">
            <span class="label">Riwayat Versi</span>
            <div class="versions">
              ${d.versions.map((x, i) => `
                <button type="button" class="chip" data-v="${i}" aria-pressed="${i === d.cur}">V${i + 1}</button>`).join("")}
            </div>
          </div>
          <div class="field">
            <label for="dRev">Instruksi Revisi</label>
            <textarea id="dRev" rows="4" placeholder="Misalnya: Ubah warna aksen jadi hijau zamrud, tambahkan FAQ accordion, perbesar form input..."></textarea>
          </div>`
        : `
          <div class="field">
            <label for="dPrompt">Halaman apa yang ingin kamu rancang?</label>
            <textarea id="dPrompt" rows="5" placeholder="Jelaskan kebutuhan halaman, susunan bagian, konten, dan nuansa visual...">${esc(designUI.draft || "")}</textarea>
          </div>
          <div class="field">
            <span class="label">Pilih dari Contoh Cepat</span>
            <div class="chips" id="dPresets">
              ${DESIGN_PRESETS.map((p, i) => `<button type="button" class="chip" data-i="${i}">${p.label}</button>`).join("")}
            </div>
          </div>`}

        <div class="field">
          <span class="label">Gaya Visual</span>
          <div class="chips" id="dStyle">
            ${DESIGN_STYLES.map(s => `<button type="button" class="chip" aria-pressed="${s === designUI.style}">${s}</button>`).join("")}
          </div>
        </div>

        <div class="field">
          <label for="dModel">Model AI Desainer</label>
          <select id="dModel">${modelOptions(d ? d.model : defModel())}</select>
        </div>

        <button class="btn primary" id="dGo">
          ${designUI.running ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> Hentikan`
            : d ? "Terapkan Revisi Desain" : "Buat Desain Sekarang"}
        </button>

        ${S.designs.length ? `
          <div class="field" style="margin-top:8px">
            <span class="label">Desain Tersimpan</span>
            <div class="saved-list">
              ${S.designs.map(x => `
                <button data-id="${x.id}" style="${x.id === (d && d.id) ? "background:var(--surface-2);font-weight:600;" : ""}">
                  <b>${esc(x.title)}</b>
                  <span>${x.versions.length} versi · ${fmtDate(x.updated)}</span>
                </button>`).join("")}
            </div>
          </div>` : ""}
      </aside>

      <section class="panel stage">
        <div class="stage-bar">
          <div class="seg" id="dDevice">
            ${[["desktop", "Desktop"], ["tablet", "Tablet"], ["mobile", "HP (Mobile)"]].map(([k, l]) => `<button data-k="${k}" aria-pressed="${designUI.device === k}">${l}</button>`).join("")}
          </div>
          <div class="row">
            <div class="seg" id="dMode">
              ${[["preview", "Pratinjau Live"], ["code", "Kode HTML"]].map(([k, l]) => `<button data-k="${k}" aria-pressed="${designUI.mode === k}">${l}</button>`).join("")}
            </div>
            <button class="btn sm" id="dOpenTab"${v ? "" : " disabled"} title="Buka di tab baru">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Buka Tab
            </button>
            <button class="btn sm" id="dCopy"${v ? "" : " disabled"}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Salin HTML
            </button>
            <button class="btn sm" id="dDl"${v ? "" : " disabled"}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Unduh .html
            </button>
          </div>
        </div>
        <div id="dStage"></div>
      </section>
    </div>
  </div>`;

  renderStage();

  const on = (id, fn) => { const el = $("#" + id); if (el) el.onclick = fn; };
  on("dNew", () => { designUI.id = null; viewDesign(main); });
  
  $$("#dPresets .chip").forEach(c => {
    c.onclick = () => {
      $("#dPrompt").value = DESIGN_PRESETS[+c.dataset.i].text;
      designUI.draft = $("#dPrompt").value;
    };
  });

  const dp = $("#dPrompt");
  if (dp) dp.oninput = () => (designUI.draft = dp.value);

  $$("#dStyle .chip").forEach(c => {
    c.onclick = () => {
      designUI.style = c.textContent;
      $$("#dStyle .chip").forEach(x => x.setAttribute("aria-pressed", String(x === c)));
    };
  });

  $$("[data-v]").forEach(b => {
    b.onclick = () => {
      d.cur = +b.dataset.v;
      saveDesigns();
      viewDesign(main);
    };
  });

  $$("#dDevice button").forEach(b => {
    b.onclick = () => {
      designUI.device = b.dataset.k;
      $$("#dDevice button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      renderStage();
    };
  });

  $$("#dMode button").forEach(b => {
    b.onclick = () => {
      designUI.mode = b.dataset.k;
      $$("#dMode button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      renderStage();
    };
  });

  $$(".design-wrap .saved-list button").forEach(b => {
    b.onclick = () => {
      designUI.id = b.dataset.id;
      viewDesign(main);
    };
  });

  on("dCopy", e => copyText(v.html, e.currentTarget));
  on("dDl", () => saveFile(slug(d.title) + "-v" + (d.cur + 1) + ".html", v.html, "text/html;charset=utf-8"));
  on("dOpenTab", () => {
    if (!v) return;
    const blob = new Blob([v.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  });

  on("dGo", () => {
    if (designUI.running) { designUI.ctl && designUI.ctl.abort(); return; }
    runDesign(main);
  });
}

function renderStage() {
  const box = $("#dStage");
  if (!box) return;
  const d = getDesign();
  const v = d ? d.versions[d.cur] : null;

  if (designUI.running) {
    box.innerHTML = `<pre class="codeview" id="dLive">${esc(designUI.live || "Menyiapkan render kode desain UI...")}</pre>`;
    const el = $("#dLive");
    if (el) el.scrollTop = el.scrollHeight;
    return;
  }

  if (!v) {
    box.innerHTML = `<div class="canvas">
      <div class="placeholder">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" stroke-width="1.3">
          <rect x="3" y="4" width="18" height="14" rx="2"/>
          <path d="M3 8h18M8 21h8"/>
        </svg>
        <b style="font-size:16px">Kanvas Desain Kosong</b>
        <span class="hint">Tuliskan deskripsi halaman atau pilih salah satu contoh di panel kiri, lalu tekan <b>Buat Desain Sekarang</b>. AI akan merancang satu file HTML utuh dengan Tailwind CSS yang dapat langsung kamu gunakan.</span>
      </div>
    </div>`;
    return;
  }

  if (designUI.mode === "code") {
    box.innerHTML = `<pre class="codeview">${esc(v.html)}</pre>`;
    return;
  }

  box.innerHTML = `<div class="canvas">
    <iframe class="frame ${designUI.device}" title="Pratinjau Desain UI" sandbox="allow-scripts allow-modals allow-forms"></iframe>
  </div>`;
  $("iframe", box).srcdoc = v.html;
}

async function runDesign(main) {
  let d = getDesign();
  const model = $("#dModel").value;
  const instr = d ? ($("#dRev").value || "").trim() : ($("#dPrompt").value || "").trim();
  if (!instr) return toast(d ? "Tuliskan instruksi revisi yang kamu inginkan." : "Jelaskan terlebih dahulu halaman yang ingin dibuat.");

  const sys = `Kamu adalah World-Class UI/UX Designer & Frontend Engineer. Hasilkan SATU file HTML lengkap dari <!doctype html> sampai </html>. Gunakan Tailwind CSS via <script src="https://cdn.tailwindcss.com"><\/script> dan Google Fonts yang elegan (misal Inter, Plus Jakarta Sans). Jangan memakai gambar eksternal yang rawan 404: buat ilustrasi dengan inline SVG, gradient modern, atau pattern geometri. Gunakan inline SVG untuk semua icon. Tulis konten realistis dalam Bahasa Indonesia yang profesional (harga Rupiah bila relevan). Wajib responsif mobile-friendly, kontras warna aksesibel, dan interaktif dengan vanilla JavaScript ringan bila relevan. Keluarkan HANYA kode HTML di dalam satu blok \`\`\`html tanpa penjelasan lain.`;
  const content = d
    ? `Ini HTML desain saat ini:\n\n\`\`\`html\n${d.versions[d.cur].html}\n\`\`\`\n\nTerapkan revisi berikut dan keluarkan HTML LENGKAP yang sudah diperbarui. Gaya visual tetap: ${designUI.style}.\n\nRevisi yang diminta: ${instr}`
    : `Buat desain halaman web/aplikasi berikut.\n\nDeskripsi: ${instr}\nGaya visual: ${designUI.style}`;

  designUI.running = true;
  designUI.live = "";
  const ctl = new AbortController();
  designUI.ctl = ctl;
  viewDesign(main);

  try {
    const out = await callAI({
      model, system: sys, messages: [{ role: "user", content }], signal: ctl.signal, tier: "default",
      onText: t => {
        designUI.live = extractHTML(t);
        const el = location.hash === "#desain" ? $("#dLive") : null;
        if (el) { el.textContent = designUI.live; el.scrollTop = el.scrollHeight; }
      }
    });

    const html = extractHTML(out);
    if (!/<\/(html|body)>/i.test(html) && !/<div|<section|<main/i.test(html)) {
      throw { message: "Model tidak mengembalikan struktur HTML yang valid. Coba ulangi kembali." };
    }

    if (!d) {
      const title = (html.match(/<title>([^<]{2,60})<\/title>/i) || [])[1] || instr.split(/[.:\n]/)[0].slice(0, 50);
      d = { id: uid(), title, model, versions: [], cur: 0, updated: Date.now() };
      S.designs.unshift(d);
      designUI.id = d.id;
      designUI.draft = "";
    }
    d.versions.push({ html, prompt: instr, at: Date.now() });
    d.versions = d.versions.slice(-10);
    d.cur = d.versions.length - 1;
    d.model = model;
    d.updated = Date.now();
    saveDesigns();
    designUI.mode = "preview";
    toast("Desain UI berhasil dibuat!");
  } catch (e) {
    if (e.code !== "cancelled") toast(errMsg(e), true);
  } finally {
    designUI.running = false;
    designUI.ctl = null;
    designUI.live = "";
    if (location.hash === "#desain") viewDesign(main);
  }
}

/* ================= 05. TEMPLATE CODEBASE ================= */
const tplUI = { cat: "Semua", q: "", open: null, tab: "agents" };

function viewTemplates(main) {
  const cats = ["Semua", ...new Set(TEMPLATES.map(t => t.cat))];

  main.innerHTML = `<div class="view">
    <div class="view-head">
      <div>
        <span class="eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><path d="M16.5 13v7M13 16.5h7"/></svg>
          Starter Kit &amp; Template
        </span>
        <h1>Mulai dari Kerangka yang Teruji</h1>
        <p class="lede">Setiap template dilengkapi struktur folder rapi, perintah setup awal, .env.example, file aturan agent (AGENTS.md), dan prompt pembuka untuk meminimalkan tebakan AI.</p>
      </div>
    </div>

    <div class="row" style="justify-content:space-between;margin-bottom:20px">
      <div class="chips" id="tCats">
        ${cats.map(c => `<button type="button" class="chip" aria-pressed="${c === tplUI.cat}">${c}</button>`).join("")}
      </div>
      <div style="width:min(320px,100%)">
        <label class="sr" for="tQ">Cari Template</label>
        <input type="search" id="tQ" placeholder="Cari stack (mis. supabase, astro)..." value="${esc(tplUI.q)}">
      </div>
    </div>

    <div class="tpl-grid" id="tGrid"></div>
  </div>
  <div id="tDrawer"></div>`;

  const draw = () => {
    const q = tplUI.q.toLowerCase();
    const list = TEMPLATES.filter(t => (tplUI.cat === "Semua" || t.cat === tplUI.cat) && (!q || (t.name + t.blurb + t.stack.join(" ")).toLowerCase().includes(q)));
    $("#tGrid").innerHTML = list.map(t => `
      <button class="panel tpl" data-id="${t.id}">
        <div class="row" style="justify-content:space-between">
          <span class="badge">${t.cat}</span>
          <span class="hint" style="font-size:12px">Lihat Detail →</span>
        </div>
        <h3>${esc(t.name)}</h3>
        <p>${esc(t.blurb)}</p>
        <div class="stack">${t.stack.map(s => `<span>${esc(s)}</span>`).join("")}</div>
      </button>`).join("") || '<div class="empty">Tidak ada template yang cocok dengan pencarianmu.</div>';

    $$("#tGrid .tpl").forEach(b => {
      b.onclick = () => {
        tplUI.open = b.dataset.id;
        tplUI.tab = "agents";
        openTpl();
      };
    });
  };

  draw();

  $$("#tCats .chip").forEach(c => {
    c.onclick = () => {
      tplUI.cat = c.textContent;
      $$("#tCats .chip").forEach(x => x.setAttribute("aria-pressed", String(x === c)));
      draw();
    };
  });

  $("#tQ").oninput = e => { tplUI.q = e.target.value; draw(); };
  if (tplUI.open) openTpl();
}

function openTpl() {
  const t = TEMPLATES.find(x => x.id === tplUI.open);
  const box = $("#tDrawer");
  if (!t || !box) return;

  const agents = templateAgentsMd(t);
  const prompt = templatePrompt(t);
  const tabs = [["agents", "AGENTS.md"], ["prompt", "Prompt Pembuka"], ["env", ".env.example"]];
  const content = tplUI.tab === "agents" ? `<div class="md" id="tBody">${md(agents)}</div>`
    : tplUI.tab === "prompt" ? `<div class="md"><pre><code>${esc(prompt)}</code></pre></div>`
    : `<div class="md"><pre><code>${esc(t.env.map(e => e + "=").join("\n") || "# Template ini tidak memerlukan environment variables khusus.")}</code></pre></div>`;

  box.innerHTML = `<div class="drawer-bg" id="tBg"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(t.name)}">
      <div class="drawer-head">
        <div>
          <span class="eyebrow">${t.cat}</span>
          <h2 style="font-size:22px">${esc(t.name)}</h2>
          <p class="lede" style="font-size:14px">${esc(t.blurb)}</p>
        </div>
        <button class="btn ghost" id="tClose" aria-label="Tutup">✕</button>
      </div>
      <div class="drawer-body">
        <div class="row">
          <button class="btn primary" id="tZip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Unduh Starter Kit (.zip)
          </button>
          <button class="btn" id="tCopyP">Salin Prompt Pembuka</button>
          <button class="btn" id="tPlan">Pakai di Rencana Proyek</button>
        </div>
        <div class="tabs" role="tablist">
          ${tabs.map(([k, l]) => `<button role="tab" data-k="${k}" aria-selected="${k === tplUI.tab}">${l}</button>`).join("")}
        </div>
        ${content}
      </div>
    </aside>`;

  $$(".md", box).forEach(enhance);

  const close = () => { tplUI.open = null; box.innerHTML = ""; };
  $("#tBg").onclick = close;
  $("#tClose").onclick = close;

  document.addEventListener("keydown", function escKey(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", escKey); }
  });

  $$(".drawer .tabs button").forEach(b => {
    b.onclick = () => {
      tplUI.tab = b.dataset.k;
      openTpl();
    };
  });

  $("#tCopyP").onclick = e => copyText(prompt, e.currentTarget);
  $("#tZip").onclick = () => saveZip(t.id + "-starter.zip", {
    "AGENTS.md": agents,
    "CLAUDE.md": agents,
    "PROMPT-MULAI.md": prompt,
    ".env.example": t.env.map(e => e + "=").join("\n") + "\n",
    "README.md": `# ${t.name}\n\n${t.blurb}\n\n## Cara Menggunakan:\n1. Ekstrak file starter kit ini ke dalam direktori proyek barumu.\n2. Buka folder tersebut dengan AI coding agent kamu (Claude Code, Cursor, Windsurf, Codex).\n3. Tempel isi PROMPT-MULAI.md sebagai pesan perintah pertama.\n\nDibuat dengan far-agent.\n`,
  });

  $("#tPlan").onclick = () => {
    const typeMap = { "Web app": "Web app", "Website": "Website / landing page", "Backend": "API / backend", "Mobile": "Aplikasi mobile", "Bot": "Bot", "Lainnya": "Ekstensi browser" };
    S.pendingStack = { stack: t.stack.join(" + "), type: typeMap[t.cat] || "Web app" };
    tplUI.open = null;
    location.hash = "#rencana";
  };
}

/* ================= 06. KUNCI API & PENGATURAN ================= */
const setUI = { q: "", free: false, show: false, keyStatus: {} };

function viewSettings(main) {
  const s = S.settings;
  const gem = isGem();
  const keys = (s.gkeys && s.gkeys.length ? s.gkeys : [""]);
  const fetchedAt = gem ? S.gemFetched : S.modelsFetched;

  const gemCard = `<section class="panel card">
    <div class="row" style="justify-content:space-between">
      <h2 style="font-size:18px">API Key Google Gemini</h2>
      <span class="badge free">Google AI Studio</span>
    </div>
    <div class="field">
      <span class="label">API Key (bisa input hingga 5 key untuk auto-fallback kuota)</span>
      <div id="gKeys" style="display:flex;flex-direction:column;gap:8px">${keys.map((k, i) => `
        <div class="key-row" data-i="${i}">
          <span class="badge tnum" style="align-self:center">Key ${i + 1}</span>
          <input type="${setUI.show ? "text" : "password"}" id="gk${i}" value="${esc(k)}" placeholder="AIzaSy..." autocomplete="off" spellcheck="false" aria-label="Key Gemini ${i + 1}">
          ${keys.length > 1 ? `<button class="btn ghost danger" data-del="${i}" aria-label="Hapus key ${i + 1}">✕</button>` : ""}
        </div>
        <span class="hint" id="gks${i}" style="margin-top:-3px">${setUI.keyStatus[i] || ""}</span>`).join("")}
      </div>
      <span class="hint">Jika satu key mencapai batas kuota rate-limit (429), far-agent otomatis merotasi pemanggilan ke key berikutnya.</span>
    </div>

    <div class="row">
      <button class="btn primary" id="gSave">Simpan Kunci</button>
      ${keys.length < 5 ? '<button class="btn" id="gAdd">+ Tambah Key Cadangan</button>' : ""}
      <button class="btn" id="gTest">Tes Validasi Semua Key</button>
      <button class="btn ghost" id="sShow">${setUI.show ? "Sembunyikan" : "Tampilkan Karakter"}</button>
    </div>

    <div class="md" style="font-size:13.5px;border-top:1px solid var(--line);padding-top:16px">
      <h3>Cara Mendapatkan API Key Gratis:</h3>
      <ol>
        <li>Buka <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> dengan akun Google kamu.</li>
        <li>Klik tombol <b>Create API key</b>, pilih atau buat Google Cloud Project.</li>
        <li>Salin key (diawali <code>AIza</code>), tempel di formulir atas, lalu klik <b>Simpan Kunci</b>.</li>
      </ol>
      <blockquote>Tier gratis Gemini API memiliki batas pemanggilan per menit (RPM) dan per hari (RPD). Model Flash (seperti <code>gemini-2.5-flash</code>) memiliki kuota gratis yang sangat lega dan respons sangat cepat.</blockquote>
    </div>
  </section>`;

  const orCard = `<section class="panel card">
    <div class="row" style="justify-content:space-between">
      <h2 style="font-size:18px">API Key OpenRouter</h2>
      <span class="badge">Multi-Provider</span>
    </div>
    <div class="field">
      <label for="sKey">API Key OpenRouter</label>
      <div class="key-row">
        <input type="${setUI.show ? "text" : "password"}" id="sKey" value="${esc(s.key)}" placeholder="sk-or-v1-..." autocomplete="off" spellcheck="false">
        <button class="btn" id="sShow">${setUI.show ? "Sembunyikan" : "Tampilkan"}</button>
      </div>
      <span class="hint">Kunci disimpan hanya di browser lokal kamu dan dikirim langsung ke API OpenRouter.</span>
    </div>

    <div class="row">
      <button class="btn primary" id="sSave">Simpan Kunci</button>
      <button class="btn" id="sTest"${s.key ? "" : " disabled"}>Tes Saldo &amp; Koneksi</button>
      ${s.key ? '<button class="btn ghost danger" id="sClear">Hapus Kunci</button>' : ""}
    </div>
    <div class="status-line" id="sStatus"></div>

    <div class="md" style="font-size:13.5px;border-top:1px solid var(--line);padding-top:16px">
      <h3>Cara Menggunakan OpenRouter:</h3>
      <ol>
        <li>Daftar akun di <a href="https://openrouter.ai" target="_blank" rel="noopener">openrouter.ai</a>.</li>
        <li>Buka menu <b>Keys</b> dan buat API key baru.</li>
        <li>Gunakan ratusan model AI (Claude 3.7, GPT-4o, DeepSeek R1, Kimi) dengan satu saldo.</li>
      </ol>
    </div>
  </section>`;

  main.innerHTML = `<div class="view">
    <div class="view-head">
      <div>
        <span class="eyebrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Pengaturan &amp; Kunci API
        </span>
        <h1>Mesin AI &amp; Preferensi</h1>
        <p class="lede">Pilih penyedia AI aktif. Gunakan <b>Google Gemini API</b> langsung untuk kecepatan maksimal, atau <b>OpenRouter</b> untuk fleksibilitas multi-model.</p>
      </div>
    </div>

    <div class="row" style="margin-bottom:20px">
      <div class="seg" id="sProv" role="group" aria-label="Sumber AI">
        <button data-p="gemini" aria-pressed="${gem}">Google Gemini API</button>
        <button data-p="openrouter" aria-pressed="${!gem}">OpenRouter</button>
      </div>
      <span class="hint">Sumber yang aktif digunakan untuk Rencana, Chat, dan Desain UI.</span>
    </div>

    <div class="set-grid">
      ${gem ? gemCard : orCard}

      <section class="panel card">
        <div class="section-title" style="margin:0">
          <h2 style="font-size:18px">Katalog &amp; Model Default</h2>
          <button class="btn sm" id="sRefresh">Sinkronkan Model Terbaru</button>
        </div>
        <div class="field">
          <label for="sModel">Model Default Aktif</label>
          <select id="sModel">${modelOptions(defModel())}</select>
        </div>
        <div class="row">
          <input type="search" id="sQ" placeholder="Cari nama model..." value="${esc(setUI.q)}" style="flex:1;min-width:160px">
          ${gem ? "" : `<button type="button" class="chip" id="sFree" aria-pressed="${setUI.free}">Hanya Model Gratis</button>`}
        </div>
        <div class="model-scroll">
          <table class="model-table">
            <thead>
              <tr>
                <th>Nama Model</th>
                ${gem ? "<th>Keterangan</th>" : '<th style="text-align:right">Input</th><th style="text-align:right">Output</th>'}
                <th style="text-align:right">Konteks</th>
              </tr>
            </thead>
            <tbody id="sRows"></tbody>
          </table>
        </div>
        <span class="hint">Klik salah satu baris tabel di atas untuk menjadikannya model default. ${fetchedAt ? "Terakhir disinkronkan " + fmtDate(fetchedAt) + "." : ""}</span>
      </section>

      <section class="panel card">
        <h2 style="font-size:18px">Backup &amp; Manajemen Data</h2>
        <p class="hint">Semua rencana proyek, percakapan chat, dan hasil rancangan desain hanya tersimpan di memori browser lokal perangkat ini.</p>
        <div class="row">
          <button class="btn" id="sExport">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Ekspor Cadangan (.json)
          </button>
          <label class="btn" for="sImport" style="cursor:pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Impor Cadangan
          </label>
          <input type="file" id="sImport" accept="application/json" hidden>
        </div>
        <div id="sDangerBox" style="margin-top:4px">
          <button class="btn ghost danger" id="sWipe">Hapus Semua Data Browser</button>
        </div>
      </section>

      <section class="panel card">
        <h2 style="font-size:18px">Preferensi Antarmuka &amp; Dokumen</h2>
        <div class="field">
          <span class="label">Tema Tampilan</span>
          <div class="chips" id="sTheme">
            ${[["auto", "Otomatis (Sistem)"], ["light", "Terang"], ["dark", "Gelap"]].map(([k, l]) => `
              <button type="button" class="chip" data-t="${k}" aria-pressed="${s.theme === k}">${l}</button>`).join("")}
          </div>
        </div>
        <div class="field" style="margin-top:6px">
          <span class="label">Bahasa Default Dokumen</span>
          <div class="chips" id="sLang">
            ${["Indonesia", "English"].map(l => `<button type="button" class="chip" aria-pressed="${l === s.lang}">${l}</button>`).join("")}
          </div>
        </div>
      </section>
    </div>
  </div>`;

  const setDefault = id => {
    if (isGem()) S.settings.gmodel = id;
    else S.settings.model = id;
    saveSettings();
    updateEngine();
  };

  const rows = () => {
    const q = setUI.q.toLowerCase();
    const cur = defModel();
    const list = curModels().filter(m => (gem || !setUI.free || isFree(m)) && (!q || (m.name + m.id).toLowerCase().includes(q))).slice(0, 200);
    $("#sRows").innerHTML = list.map(m => `
      <tr data-id="${esc(m.id)}" style="cursor:pointer${m.id === cur ? ";background:var(--accent-soft);font-weight:600;" : ""}">
        <td>${esc(m.name)} ${!gem && isFree(m) ? '<span class="badge free">gratis</span>' : ""}<span class="id">${esc(m.id)}</span></td>
        ${gem ? `<td>${esc(m.tag || "Tersedia")}</td>` : `<td class="n">${isFree(m) ? "–" : "$" + m.inP}</td><td class="n">${isFree(m) ? "–" : "$" + m.outP}</td>`}
        <td class="n">${m.ctx ? fmtTok(m.ctx) : "–"}</td>
      </tr>`).join("") || '<tr><td colspan="4" class="muted" style="text-align:center;padding:16px">Tidak ada model yang cocok.</td></tr>';

    $$("#sRows tr[data-id]").forEach(tr => {
      tr.onclick = () => {
        setDefault(tr.dataset.id);
        $("#sModel").innerHTML = modelOptions(defModel());
        rows();
        toast("Model default diubah: " + modelName(tr.dataset.id));
      };
    });
  };
  rows();

  $$("#sProv button").forEach(b => {
    b.onclick = () => {
      S.settings.provider = b.dataset.p;
      saveSettings();
      updateEngine();
      setUI.q = "";
      viewSettings(main);
      if (Date.now() - (isGem() ? S.gemFetched : S.modelsFetched) > 864e5) {
        refreshModels(false).then(ok => ok && location.hash === "#pengaturan" && viewSettings(main));
      }
    };
  });

  $("#sShow").onclick = () => { setUI.show = !setUI.show; readKeys(); viewSettings(main); };
  $("#sModel").onchange = e => { setDefault(e.target.value); rows(); };
  $("#sRefresh").onclick = async e => {
    e.currentTarget.disabled = true;
    if (await refreshModels(true)) viewSettings(main);
    else e.currentTarget.disabled = false;
  };
  $("#sQ").oninput = e => { setUI.q = e.target.value; rows(); };

  const fr = $("#sFree");
  if (fr) fr.onclick = e => {
    setUI.free = !setUI.free;
    e.currentTarget.setAttribute("aria-pressed", String(setUI.free));
    rows();
  };

  function readKeys() {
    if (!$("#gKeys")) return;
    S.settings.gkeys = $$("#gKeys input").map(i => i.value.trim());
  }

  if (gem) {
    $("#gSave").onclick = () => {
      readKeys();
      const bad = S.settings.gkeys.filter(k => k && !/^AIza/.test(k)).length;
      if (bad) toast("Key Google AI Studio biasanya diawali 'AIza'. Kunci tetap disimpan.");
      S.settings.gkeys = S.settings.gkeys.filter(Boolean);
      if (!S.settings.gkeys.length) S.settings.gkeys = [""];
      setUI.keyStatus = {};
      saveSettings();
      updateEngine();
      toast(gemKeys().length + " API key Gemini berhasil disimpan.");
      viewSettings(main);
      if (gemKeys().length && !S.gemFetched) {
        refreshGemModels(false).then(ok => ok && location.hash === "#pengaturan" && viewSettings(main));
      }
    };

    const add = $("#gAdd");
    if (add) add.onclick = () => {
      readKeys();
      S.settings.gkeys.push("");
      viewSettings(main);
      $("#gk" + (S.settings.gkeys.length - 1)).focus();
    };

    $$("[data-del]").forEach(b => {
      b.onclick = () => {
        readKeys();
        S.settings.gkeys.splice(+b.dataset.del, 1);
        setUI.keyStatus = {};
        saveSettings();
        updateEngine();
        viewSettings(main);
      };
    });

    $("#gTest").onclick = async () => {
      readKeys();
      const ks = S.settings.gkeys;
      await Promise.all(ks.map(async (k, i) => {
        const el = $("#gks" + i);
        if (!el) return;
        if (!k) { el.innerHTML = ""; return; }
        el.innerHTML = '<span class="thinking">Memvalidasi key...</span>';
        let msg;
        try {
          const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": k } });
          if (r.ok) {
            msg = '<i class="dot ok" style="display:inline-block"></i> Key aktif &amp; valid siap digunakan';
          } else {
            let m = ""; try { m = (await r.json()).error?.message || ""; } catch {}
            msg = '<i class="dot bad" style="display:inline-block"></i> ' + esc(gemErr(r.status, m, i).message);
          }
        } catch {
          msg = '<i class="dot warn" style="display:inline-block"></i> Terhubung di browser (koneksi keluar diverifikasi saat dipanggil)';
        }
        setUI.keyStatus[i] = msg;
        el.innerHTML = msg;
      }));
    };
  } else {
    $("#sSave").onclick = () => {
      const v = $("#sKey").value.trim();
      S.settings.key = v;
      saveSettings();
      updateEngine();
      toast(v ? "API key OpenRouter disimpan." : "API key dikosongkan.");
      viewSettings(main);
    };

    const clr = $("#sClear");
    if (clr) clr.onclick = () => {
      S.settings.key = "";
      saveSettings();
      updateEngine();
      viewSettings(main);
      toast("API key dihapus.");
    };

    $("#sTest").onclick = async () => {
      const st = $("#sStatus");
      st.innerHTML = '<span class="thinking">Menghubungi OpenRouter...</span>';
      try {
        const r = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: "Bearer " + S.settings.key } });
        if (r.status === 401) throw { code: 401 };
        if (!r.ok) throw { message: "OpenRouter mengembalikan kode " + r.status };
        const j = (await r.json()).data || {};
        const lim = j.limit == null ? "Unlimited" : "$" + (+j.limit).toFixed(2);
        st.innerHTML = `<i class="dot ok"></i> Terhubung. Terpakai $${(+j.usage || 0).toFixed(2)} dari limit ${lim}.`;
      } catch (e) {
        const m = e && e.code === 401 ? ERR[401] : (e && e.message) || "Koneksi diverifikasi saat memanggil.";
        st.innerHTML = `<i class="dot bad"></i> ${esc(m)}`;
      }
    };
  }

  $$("#sTheme .chip").forEach(c => {
    c.onclick = () => {
      applyTheme(c.dataset.t);
      $$("#sTheme .chip").forEach(x => x.setAttribute("aria-pressed", String(x === c)));
    };
  });

  $$("#sLang .chip").forEach(c => {
    c.onclick = () => {
      S.settings.lang = c.textContent;
      saveSettings();
      $$("#sLang .chip").forEach(x => x.setAttribute("aria-pressed", String(x === c)));
      toast("Bahasa dokumen default: " + s.lang);
    };
  });

  $("#sExport").onclick = () => {
    saveFile("far-agent-backup.json", JSON.stringify({
      app: "far-agent",
      v: 2,
      plans: S.plans,
      chats: S.chats,
      designs: S.designs,
      settings: { provider: s.provider, model: s.model, gmodel: s.gmodel, lang: s.lang, theme: s.theme }
    }, null, 2), "application/json");
  };

  $("#sImport").onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== "far-agent") throw 0;
      const merge = (a, b) => {
        const ids = new Set(a.map(x => x.id));
        return [...a, ...(b || []).filter(x => !ids.has(x.id))];
      };
      S.plans = merge(S.plans, j.plans);
      S.chats = merge(S.chats, j.chats);
      S.designs = merge(S.designs, j.designs);
      savePlans(); saveChats(); saveDesigns();
      toast("Data backup berhasil diimpor!");
      viewSettings(main);
    } catch {
      toast("Format file backup tidak valid.", true);
    }
    e.target.value = "";
  };

  $("#sWipe").onclick = () => {
    $("#sDangerBox").innerHTML = `<div class="confirm">
      <span>Yakin ingin menghapus seluruh data rencana, chat, dan API key?</span>
      <div class="row">
        <button class="btn sm danger" id="sWipeYes">Ya, Hapus Semua</button>
        <button class="btn sm" id="sWipeNo">Batal</button>
      </div>
    </div>`;
    $("#sWipeNo").onclick = () => viewSettings(main);
    $("#sWipeYes").onclick = () => {
      try {
        Object.keys(localStorage).filter(k => k.startsWith("fa:")).forEach(k => localStorage.removeItem(k));
      } catch {}
      S.settings = DEFAULT_SETTINGS();
      S.plans = [EXAMPLE_PLAN];
      S.chats = [];
      S.designs = [];
      savePlans();
      updateEngine();
      toast("Semua data telah dibersihkan.");
      viewSettings(main);
    };
  };
}

/* ================= INISIALISASI ================= */
window.addEventListener("hashchange", route);

// Theme toggle buttons in sidebar and mobile header
const tb = $("#themeToggle");
if (tb) tb.onclick = toggleTheme;
const mtb = $("#mobileThemeToggle");
if (mtb) mtb.onclick = toggleTheme;

applyTheme(S.settings.theme || "auto");
route();
updateEngine();

if (Date.now() - (isGem() ? S.gemFetched : S.modelsFetched) > 864e5 && (!isGem() || gemKeys().length)) {
  refreshModels(false).then(ok => {
    if (ok && location.hash === "#pengaturan") route();
  });
}
})();
