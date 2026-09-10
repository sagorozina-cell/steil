/* =========================================================
   Steil — Stylish Name Generator | main.js
   Data-driven styling engine: loads 100 font/decoration
   styles + 224 prefix/suffix symbols and auto-generates
   thousands of unique name designs from a single input.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- Config ---------------- */
  const DATA_PATH   = "assets/data/";
  const PAGE_SIZE   = 30;    // কার্ডগুলো একবারে যতগুলো দেখানো হবে
  const DEBOUNCE_MS = 160;
  const FAV_KEY      = "steil_favorites_v1";
  const THEME_KEY     = "steil_theme_v1";
  const ACCENT_KEY   = "steil_accent_v1";
  const FONT_KEY      = "steil_site_font_v1";

  const CAT_LABELS = {
    all:    { bn: "সব স্টাইল",        icon: "sparkle" },
    font:   { bn: "ফ্যান্সি ফন্ট",     icon: "font" },
    deco:   { bn: "রয়্যাল ডেকোরেশন", icon: "crown" },
    mark:   { bn: "স্পেশাল মার্ক",     icon: "mark" },
    symbol: { bn: "সিম্বল কম্বো",      icon: "link" },
    fav:    { bn: "সেভ করা স্টাইল",    icon: "star" }
  };

  const ACCENTS = [
    { name: "ইন্ডিগো",  value: "#6366f1", from: "#6366f1", to: "#a855f7" },
    { name: "গোলাপি",   value: "#ec4899", from: "#ec4899", to: "#f97316" },
    { name: "সবুজ",     value: "#10b981", from: "#10b981", to: "#06b6d4" },
    { name: "কমলা",     value: "#f97316", from: "#f97316", to: "#eab308" },
    { name: "নীল",      value: "#0ea5e9", from: "#0ea5e9", to: "#6366f1" },
    { name: "লাল",      value: "#ef4444", from: "#ef4444", to: "#ec4899" }
  ];

  /* ---------------- State ---------------- */
  let styles      = [];              // full 100-style dataset
  let prefixes    = [];
  let suffixes    = [];
  let combos      = [];              // বর্তমান রেজাল্ট লিস্ট
  let shownCount  = 0;
  let debounceTimer = null;
  let dataReady   = false;
  let currentCat  = "all";
  let searchQuery = "";
  let favorites   = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));

  /* ---------------- DOM ---------------- */
  const $ = (id) => document.getElementById(id);

  const nameInput    = $("nameInput");
  const resultsGrid  = $("resultsGrid");
  if (!nameInput || !resultsGrid) return; // safety guard for non-generator pages

  const clearBtn     = $("clearInputBtn");
  const charCounter  = $("charCounter");
  const searchEl     = $("styleSearch");
  const usePrefixEl  = $("usePrefix");
  const useSuffixEl  = $("useSuffix");
  const resultCount  = $("totalStyleLabel");
  const loadMoreBtn  = $("loadMoreBtn");
  const shuffleBtn   = $("shuffleBtn");
  const accentWrap   = $("accentSwatches");
  const fontToggleBtn = $("fontToggleBtn");
  const toastEl      = $("toastNotification");

  /* ---------------- Data Loading ---------------- */
  async function loadJSON(file) {
    try {
      const res = await fetch(DATA_PATH + file);
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (err) {
      console.error("ডাটা লোড করতে সমস্যা:", file, err);
      return null;
    }
  }

  async function init() {
    resultsGrid.innerHTML = '<p class="empty-msg">⏳ ডাটা লোড হচ্ছে...</p>';

    const [styleData, pre, suf] = await Promise.all([
      loadJSON("styles-01.json"),
      loadJSON("prefix-symbols.json"),
      loadJSON("suffix-symbols.json")
    ]);

    styles   = (styleData && Array.isArray(styleData.styles)) ? styleData.styles : [];
    prefixes = Array.isArray(pre) ? pre : [];
    suffixes = Array.isArray(suf) ? suf : [];
    dataReady = true;

    buildCategoryTabs();
    updateCounts();

    if (styles.length === 0) {
      resultsGrid.innerHTML = '<p class="empty-msg">⚠️ কোনো স্টাইল ডাটা পাওয়া যায়নি।</p>';
      return;
    }

    processInput(getVal());
  }

  /* ---------------- Style Engine ---------------- */
  function mapChars(text, map, reverse) {
    let arr = Array.from(text).map((c) => (map[c] !== undefined ? map[c] : c));
    if (reverse) arr = arr.reverse();
    return arr.join("");
  }

  function applyStyle(text, style) {
    try {
      switch (style.type) {
        case "map":
          return mapChars(text, style.map, false);
        case "flip":
          return mapChars(text, style.map, !!style.reverse);
        case "combine":
          return Array.from(text).map((c) => c + style.char).join("");
        case "wrapper":
          return (style.prefix || "") + text + (style.suffix || "");
        case "join":
          return Array.from(text).join(style.separator || "");
        case "each":
          return Array.from(text)
            .map((c) => (style.prefix || "") + c + (style.suffix || ""))
            .join("");
        default:
          return text;
      }
    } catch (e) {
      return text;
    }
  }

  function getVal() {
    return nameInput.value.trim() || "Your Name";
  }

  function getFilteredStyles() {
    const q = searchQuery.toLowerCase().trim();
    return styles.filter((s) => {
      if (currentCat === "fav" && !favorites.has(s.id)) return false;
      if (currentCat !== "all" && currentCat !== "fav" && s.cat !== currentCat) return false;
      if (q && !(s.name.toLowerCase().includes(q) || (s.bn || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }

  function buildCombinations(rawText) {
    const wantPre = usePrefixEl && usePrefixEl.checked;
    const wantSuf = useSuffixEl && useSuffixEl.checked;
    const preList = wantPre ? prefixes : [""];
    const sufList = wantSuf ? suffixes : [""];
    const list = [];

    getFilteredStyles().forEach((style) => {
      const styled = applyStyle(rawText, style);
      preList.forEach((p) => {
        sufList.forEach((s) => {
          list.push({ id: style.id, name: style.name, bn: style.bn, text: p + styled + s });
        });
      });
    });
    return list;
  }

  /* ---------------- Rendering ---------------- */
  function iconSVG(name) {
    const icons = {
      copy: '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="12" height="12" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      check: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5 5L20 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      star: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5l2.6 5.6 6 .7-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.8l6-.7L12 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      starFilled: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.6 6 .7-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.8l6-.7L12 3.5z"/></svg>'
    };
    return icons[name] || "";
  }

  function renderNextPage() {
    const slice = combos.slice(shownCount, shownCount + PAGE_SIZE);
    const frag = document.createDocumentFragment();

    slice.forEach((c) => {
      const isFav = favorites.has(c.id);
      const card = document.createElement("div");
      card.className = "style-card";
      card.innerHTML = `
        <div class="card-top">
          <span class="style-title-badge">${escapeHTML(c.bn || c.name)}</span>
          <button class="fav-icon-btn ${isFav ? "active" : ""}" data-id="${c.id}" aria-label="প্রিয় তালিকায় রাখুন">${iconSVG(isFav ? "starFilled" : "star")}</button>
        </div>
        <div class="card-preview-text">${escapeHTML(c.text)}</div>
        <div class="card-bottom">
          <button class="copy-action-btn" data-text="${escapeAttr(c.text)}">${iconSVG("copy")}<span>কপি করুন</span></button>
        </div>
      `;
      frag.appendChild(card);
    });

    resultsGrid.appendChild(frag);
    shownCount += slice.length;
    updateLoadMore();
  }

  function escapeHTML(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }
  function escapeAttr(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function updateLoadMore() {
    const remaining = combos.length - shownCount;
    if (loadMoreBtn) loadMoreBtn.hidden = remaining <= 0;
    if (resultCount) {
      resultCount.textContent = combos.length > 0
        ? `মোট ${shownCount.toLocaleString("en-US")} / ${combos.length.toLocaleString("en-US")}টি ডিজাইন দেখানো হচ্ছে`
        : "কোনো ডিজাইন পাওয়া যায়নি";
    }
  }

  function processInput(rawText) {
    combos = buildCombinations(rawText);
    shownCount = 0;
    resultsGrid.innerHTML = "";

    if (combos.length === 0) {
      resultsGrid.innerHTML = '<p class="empty-msg">😕 এই ফিল্টারে কোনো স্টাইল পাওয়া যায়নি। ভিন্ন ক্যাটাগরি বা সার্চ চেষ্টা করুন।</p>';
      updateLoadMore();
      return;
    }
    renderNextPage();
  }

  /* ---------------- Sidebar / Category Tabs ---------------- */
  function buildCategoryTabs() {
    document.querySelectorAll(".cat-item").forEach((item) => {
      const cat = item.dataset.cat;
      item.addEventListener("click", () => {
        document.querySelectorAll(".cat-item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        currentCat = cat;
        if (dataReady) processInput(getVal());
      });
    });
  }

  function updateCounts() {
    const setCount = (id, n) => { const el = $(id); if (el) el.textContent = n.toLocaleString("en-US"); };
    setCount("cntAll", styles.length);
    setCount("cntFont", styles.filter((s) => s.cat === "font").length);
    setCount("cntDeco", styles.filter((s) => s.cat === "deco").length);
    setCount("cntMark", styles.filter((s) => s.cat === "mark").length);
    setCount("cntSymbol", styles.filter((s) => s.cat === "symbol").length);
    setCount("cntFav", favorites.size);
  }

  /* ---------------- Accent Colour Customiser ---------------- */
  function buildAccentSwatches() {
    if (!accentWrap) return;
    accentWrap.innerHTML = ACCENTS.map((a) =>
      `<button class="accent-swatch" style="--sw-color:${a.value}" data-from="${a.from}" data-to="${a.to}" title="${a.name}" aria-label="${a.name} থিম"></button>`
    ).join("");

    accentWrap.querySelectorAll(".accent-swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyAccent(btn.dataset.from, btn.dataset.to);
        localStorage.setItem(ACCENT_KEY, JSON.stringify({ from: btn.dataset.from, to: btn.dataset.to }));
        accentWrap.querySelectorAll(".accent-swatch").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  function applyAccent(from, to) {
    const root = document.documentElement.style;
    root.setProperty("--primary", from);
    root.setProperty("--primary-gradient", `linear-gradient(135deg, ${from}, ${to})`);
  }

  function restoreAccent() {
    const saved = JSON.parse(localStorage.getItem(ACCENT_KEY) || "null");
    if (saved) {
      applyAccent(saved.from, saved.to);
      if (accentWrap) {
        setTimeout(() => {
          accentWrap.querySelectorAll(".accent-swatch").forEach((b) => {
            if (b.dataset.from === saved.from) b.classList.add("active");
          });
        }, 0);
      }
    }
  }

  /* ---------------- Site Font Toggle ---------------- */
  function restoreFont() {
    const f = localStorage.getItem(FONT_KEY) || "modern";
    document.documentElement.setAttribute("data-font", f);
  }
  if (fontToggleBtn) {
    fontToggleBtn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-font") === "playful" ? "modern" : "playful";
      document.documentElement.setAttribute("data-font", cur);
      localStorage.setItem(FONT_KEY, cur);
    });
  }

  /* ---------------- Events ---------------- */
  nameInput.addEventListener("input", () => {
    if (charCounter) charCounter.textContent = nameInput.value.length;
    if (clearBtn) clearBtn.style.display = nameInput.value ? "flex" : "none";
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { if (dataReady) processInput(getVal()); }, DEBOUNCE_MS);
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      nameInput.value = "";
      nameInput.dispatchEvent(new Event("input"));
      nameInput.focus();
    });
  }

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      searchQuery = searchEl.value;
      if (dataReady) processInput(getVal());
    });
  }

  [usePrefixEl, useSuffixEl].forEach((el) => {
    if (el) el.addEventListener("change", () => { if (dataReady) processInput(getVal()); });
  });

  document.querySelectorAll(".tag-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      nameInput.value = chip.textContent.trim();
      nameInput.dispatchEvent(new Event("input"));
    });
  });

  if (loadMoreBtn) loadMoreBtn.addEventListener("click", renderNextPage);

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      for (let i = combos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combos[i], combos[j]] = [combos[j], combos[i]];
      }
      shownCount = 0;
      resultsGrid.innerHTML = "";
      renderNextPage();
    });
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  resultsGrid.addEventListener("click", (e) => {
    const copyBtn = e.target.closest(".copy-action-btn");
    if (copyBtn) {
      const text = copyBtn.getAttribute("data-text");
      copyToClipboard(text).then(() => {
        showToast("📋 নাম কপি করা হয়েছে!");
        const span = copyBtn.querySelector("span");
        const original = span.textContent;
        span.textContent = "কপি হয়েছে!";
        copyBtn.classList.add("copied");
        setTimeout(() => { span.textContent = original; copyBtn.classList.remove("copied"); }, 1600);
      }).catch(() => showToast("⚠️ কপি করা যায়নি, ম্যানুয়ালি সিলেক্ট করুন।"));
      return;
    }
    const favBtn = e.target.closest(".fav-icon-btn");
    if (favBtn) {
      const id = Number(favBtn.getAttribute("data-id"));
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
      favBtn.classList.toggle("active");
      favBtn.innerHTML = iconSVG(favorites.has(id) ? "starFilled" : "star");
      updateCounts();
      if (currentCat === "fav") processInput(getVal());
    }
  });

  function setupInfiniteScroll() {
    if (!loadMoreBtn || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && shownCount < combos.length) renderNextPage();
      });
    }, { rootMargin: "400px" });
    observer.observe(loadMoreBtn);
  }

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------------- Theme Toggle ---------------- */
  const themeBtn = $("themeBtn");
  function restoreTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const theme = saved || document.documentElement.getAttribute("data-theme") || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    if (themeBtn) themeBtn.innerHTML = theme === "dark" ? sunMoonIcon("moon") : sunMoonIcon("sun");
  }
  function sunMoonIcon(kind) {
    if (kind === "moon") return '<svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const next = isDark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      themeBtn.innerHTML = next === "dark" ? sunMoonIcon("moon") : sunMoonIcon("sun");
    });
  }

  /* ---------------- Mobile Nav ---------------- */
  const menuToggleBtn = $("menuToggleBtn");
  const navMenu = $("navMenu");
  if (menuToggleBtn && navMenu) {
    menuToggleBtn.addEventListener("click", () => navMenu.classList.toggle("open"));
  }

  /* ---------------- FAQ Accordion ---------------- */
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => btn.parentElement.classList.toggle("open"));
  });

  /* ---------------- Footer Year ---------------- */
  const yearSpan = $("yearSpan");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  /* ---------------- Boot ---------------- */
  restoreTheme();
  restoreFont();
  restoreAccent();
  buildAccentSwatches();
  setupInfiniteScroll();
  init();
})();
