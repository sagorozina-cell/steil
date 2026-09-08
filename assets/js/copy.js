/* =========================================================
   Steil — Stylish Name Generator | copy.js
   Handles "Copy" button clicks + toast notification.
   Uses event delegation (works for lazy-loaded cards too).
   ========================================================= */

(function () {
  "use strict";

  const resultsBox = document.getElementById("results");
  const toast      = document.getElementById("copyToast");

  if (!resultsBox) return;

  let toastTimer = null;

  // ---------- Toast show/hide ----------
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message || "কপি হয়েছে! ✔";
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 1800);
  }

  // ---------- Copy to clipboard (with fallback) ----------
  async function copyText(text, btn) {
    try {
      // আধুনিক ব্রাউজার
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // পুরনো ব্রাউজার / HTTP ফলব্যাক
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

      // বাটনে "Copied" ফিডব্যাক
      if (btn) {
        const original = btn.textContent;
        btn.textContent = "Copied ✔";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("copied");
        }, 1400);
      }

      showToast("কপি হয়েছে! ✔");
    } catch (err) {
      console.error("কপি করতে সমস্যা:", err);
      showToast("কপি হয়নি — ম্যানুয়ালি কপি করুন");
    }
  }

  // ---------- Event Delegation (lazy-loaded কার্ডের জন্যও কাজ করে) ----------
  resultsBox.addEventListener("click", function (e) {
    const btn = e.target.closest(".btn-copy");
    if (!btn) return;

    const text = btn.getAttribute("data-copy");
    if (text !== null && text !== undefined) {
      copyText(text, btn);
    }
  });

  // ---------- Keyboard accessibility (Enter/Space on button) ----------
  resultsBox.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      const btn = e.target.closest(".btn-copy");
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
  });
})();
