(function () {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const title = message ? message.slice(0, 72) : "Steil feedback";
    const body = [
      message || "আমি Steil সম্পর্কে একটি প্রশ্ন বা ফিডব্যাক দিতে চাই।",
      "",
      name ? `নাম: ${name}` : "",
      email ? `ইমেইল: ${email}` : ""
    ].filter(Boolean).join("\n");

    const issueUrl = new URL("https://github.com/sagorozina-cell/steil/issues/new");
    issueUrl.searchParams.set("title", title);
    issueUrl.searchParams.set("body", body);
    window.open(issueUrl.toString(), "_blank", "noopener,noreferrer");
  });
})();
