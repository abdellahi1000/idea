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
