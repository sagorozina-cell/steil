/* =========================================================
   Steil — Stylish Name Generator | main.js
   Loads base-styles + prefix/suffix symbols, generates
   millions of unique combinations with lazy loading.
   ========================================================= */

(function () {
  "use strict";

  // ---------- Config ----------
  const DATA_PATH = "assets/data/";
  const PAGE_SIZE = 40;          // একবারে যতগুলো কার্ড দেখাবে
  const DEBOUNCE_MS = 180;       // টাইপ করার পর যত ms অপেক্ষা করবে

  // ---------- State ----------
  let baseStyles = [];           // [{id,name,bn,type,map}, ...]
  let prefixes = [];             // ["꧁༒☬ ", ...]
  let suffixes = [];             // [" ☬꧂", ...]
  let combos = [];               // বর্তমান ইনপুটের সব কম্বিনেশন [{text, styleName}, ...]
  let shownCount = 0;            // এখন পর্যন্ত যতগুলো দেখানো হয়েছে
  let debounceTimer = null;
  let dataReady = false;

  // ---------- DOM ----------
  const nameInput   = document.getElementById("nameInput");
  const usePrefix   = document.getElementById("usePrefix");
  const useSuffix   = document.getElementById("useSuffix");
  const resultsBox  = document.getElementById("results");
  const loadMoreBtn = document.getElementById("loadMore");
  const resultCount = document.getElementById("resultCount");

  if (!nameInput || !resultsBox) return; // safety

  // ---------- Data Loading ----------
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
    resultsBox.innerHTML = '<p class="empty-msg">⏳ ডাটা লোড হচ্ছে...</p>';

    const [styles, pre, suf] = await Promise.all([
      loadJSON("base-styles.json"),
      loadJSON("prefix-symbols.json"),
      loadJSON("suffix-symbols.json")
    ]);

    baseStyles = Array.isArray(styles) ? styles : [];
    prefixes   = Array.isArray(pre) ? pre : [];
    suffixes   = Array.isArray(suf) ? suf : [];

    // শুধু "map" টাইপের স্টাইলগুলোই এই ভার্সনে সাপোর্টেড
    baseStyles = baseStyles.filter(s => s && s.type === "map" && s.map);

    dataReady = true;

    if (baseStyles.length === 0) {
      resultsBox.innerHTML = '<p class="empty-msg">⚠️ কোনো ফন্ট স্টাইল ডাটা পাওয়া যায়নি।</p>';
      updateCount(0);
      return;
    }

    // ইনপুটে আগে থেকে কিছু থাকলে প্রসেস করো
    if (nameInput.value.trim()) {
      processInput(nameInput.value.trim());
    } else {
      resultsBox.innerHTML = '<p class="empty-msg">✍️ উপরে আপনার নাম লিখুন — সাথে সাথে শত শত স্টাইলিশ ডিজাইন দেখাবে!</p>';
      updateCount(0);
    }
  }

  // ---------- Core: text → styled text ----------
  function applyMap(text, map) {
    let out = "";
    for (const ch of text) {           // for...of = বাংলা/ইমোজি সেফ
      out += (map[ch] !== undefined) ? map[ch] : ch;
    }
    return out;
  }

  // ---------- Build all combinations (lazy: array only, no DOM) ----------
  function buildCombinations(rawText) {
    const list = [];
    const wantPre = usePrefix && usePrefix.checked;
    const wantSuf = useSuffix && useSuffix.checked;

    const preList = wantPre ? prefixes : [""];
    const sufList = wantSuf ? suffixes : [""];

    for (const style of baseStyles) {
      const styled = applyMap(rawText, style.map);
      for (const p of preList) {
        for (const s of sufList) {
          // খালি প্রিফিক্স+সাফিক্স হলেও ফন্ট স্টাইলটা দেখাবো
          list.push({ text: p + styled + s, styleName: style.name });
        }
      }
    }
    return list;
  }

  // ---------- Render a slice of combos into DOM ----------
  function renderNextPage() {
    const slice = combos.slice(shownCount, shownCount + PAGE_SIZE);
    const frag = document.createDocumentFragment();

    slice.forEach(c => {
      const card = document.createElement("div");
      card.className = "result-card";

      const span = document.createElement("span");
      span.className = "result-text";
      span.textContent = c.text;     // textContent = XSS সেফ

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-copy";
      btn.textContent = "Copy";
      btn.setAttribute("data-copy", c.text);
      btn.setAttribute("aria-label", "কপি করুন: " + c.text);

      card.appendChild(span);
      card.appendChild(btn);
      frag.appendChild(card);
    });

    resultsBox.appendChild(frag);
    shownCount += slice.length;
    updateLoadButton();
  }

  function updateCount(total) {
    if (resultCount) {
      resultCount.textContent = total > 0
        ? shownCount.toLocaleString("en-US") + " / " + total.toLocaleString("en-US") + "টি ডিজাইন"
        : "";
    }
  }

  function updateLoadButton() {
    const remaining = combos.length - shownCount;
    if (loadMoreBtn) {
      loadMoreBtn.hidden = remaining <= 0;
    }
    updateCount(combos.length);
  }

  // ---------- Process input (debounced) ----------
  function processInput(rawText) {
    combos = buildCombinations(rawText);
    shownCount = 0;
    resultsBox.innerHTML = "";

    if (combos.length === 0) {
      resultsBox.innerHTML = '<p class="empty-msg">কোনো ডিজাইন তৈরি হয়নি।</p>';
      updateCount(0);
      return;
    }

    // লাখ লাখ কম্বিনেশন হতে পারে — সব একবারে DOM-এ না, পেজে পেজে
    renderNextPage();

    // অনেক বেশি হলে সতর্কতা ছাড়াই lazy load চালু থাকে
    if (combos.length > 50000) {
      console.info("মোট কম্বিনেশন:", combos.length, "(lazy load চালু)");
    }
  }

  function onInput() {
    clearTimeout(debounceTimer);
    const val = nameInput.value.trim();
    if (!val) {
      combos = [];
      shownCount = 0;
      resultsBox.innerHTML = '<p class="empty-msg">✍️ উপরে আপনার নাম লিখুন — সাথে সাথে শত শত স্টাইলিশ ডিজাইন দেখাবে!</p>';
      updateCount(0);
      if (loadMoreBtn) loadMoreBtn.hidden = true;
      return;
    }
    debounceTimer = setTimeout(() => processInput(val), DEBOUNCE_MS);
  }

  // ---------- Infinite scroll (IntersectionObserver) ----------
  function setupInfiniteScroll() {
    if (!loadMoreBtn || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && shownCount < combos.length) {
          renderNextPage();
        }
      });
    }, { rootMargin: "300px" });
    observer.observe(loadMoreBtn);
  }

  // ---------- Events ----------
  nameInput.addEventListener("input", onInput);

  if (usePrefix) usePrefix.addEventListener("change", () => {
    if (nameInput.value.trim() && dataReady) processInput(nameInput.value.trim());
  });
  if (useSuffix) useSuffix.addEventListener("change", () => {
    if (nameInput.value.trim() && dataReady) processInput(nameInput.value.trim());
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", renderNextPage);
  }

  // ---------- Boot ----------
  setupInfiniteScroll();
  init();
})();
