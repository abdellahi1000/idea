// Any form with data-confirm="message" requires an explicit browser
// confirmation before it submits - used on every destructive/administrative
// action per the "confirmation dialogs before destructive actions" rule.
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form instanceof HTMLFormElement && form.dataset.confirm) {
    if (!window.confirm(form.dataset.confirm)) {
      event.preventDefault();
    }
  }
});

// Password show/hide toggle: any button with [data-password-toggle="<input id>"]
// flips that input between type="password" and type="text".
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-password-toggle]");
  if (!button) return;

  const input = document.getElementById(button.dataset.passwordToggle);
  if (!input) return;

  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";

  const icon = button.querySelector("i");
  if (icon) {
    icon.classList.toggle("bi-eye", !isHidden);
    icon.classList.toggle("bi-eye-slash", isHidden);
  }
});

// Team page: master-detail customer selector + AI verification workspace.
// The customer list (search + pagination) and the workspace both swap via
// fetch()'d HTML fragments instead of full page reloads, per the Team page
// architecture spec - Section 1 only ever selects a customer, Section 2
// always shows exactly one customer's data at a time.
(() => {
  const listEl = document.getElementById("team-customer-list");
  const workspaceEl = document.getElementById("team-workspace");
  if (!listEl || !workspaceEl) return;

  const searchInput = document.getElementById("team-search");
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
  let searchTimer;

  async function loadList(url) {
    const response = await fetch(url);
    listEl.innerHTML = await response.text();
  }

  async function loadWorkspace(userId) {
    workspaceEl.innerHTML = '<div class="table-card text-center text-muted py-5">Loading…</div>';
    const response = await fetch(`/team/${userId}/workspace`);
    workspaceEl.innerHTML = await response.text();
  }

  searchInput?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = encodeURIComponent(searchInput.value.trim());
      loadList(`/team/list-partial?q=${q}`);
    }, 300);
  });

  listEl.addEventListener("click", (event) => {
    const row = event.target.closest(".team-customer-row");
    if (row) {
      listEl.querySelectorAll(".team-customer-row").forEach((r) => r.classList.remove("table-active"));
      row.classList.add("table-active");
      loadWorkspace(row.dataset.userId);
      return;
    }

    const pageLink = event.target.closest("a.page-link");
    if (pageLink) {
      event.preventDefault();
      loadList(pageLink.href);
    }
  });

  workspaceEl.addEventListener("submit", async (event) => {
    const form = event.target.closest("#team-generate-form");
    if (!form) return;
    event.preventDefault();

    const button = form.querySelector("button");
    button.disabled = true;
    button.textContent = "Generating…";

    const response = await fetch(`/team/${form.dataset.userId}/generate`, {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken },
    });
    workspaceEl.innerHTML = await response.text();
  });
})();
