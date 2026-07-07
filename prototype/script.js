const beginButton = document.getElementById("beginButton");
const welcome = document.getElementById("welcome");
const writingArea = document.getElementById("writingArea");
const entry = document.getElementById("entry");
const saveStatus = document.getElementById("saveStatus");
const themeButton = document.getElementById("themeButton");
const dateText = document.getElementById("dateText");

const savedEntry = localStorage.getItem("entry");
const savedTheme = localStorage.getItem("theme");

if (savedEntry) {
  entry.value = savedEntry;
}

if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeButton.textContent = "Modo claro";
}

const today = new Date();

dateText.textContent = today.toLocaleDateString("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

beginButton.addEventListener("click", () => {
  welcome.classList.add("hidden");
  writingArea.classList.remove("hidden");
  entry.focus();
});

let saveTimeout;

entry.addEventListener("input", () => {
  localStorage.setItem("entry", entry.value);

  saveStatus.textContent = "Guardando...";

  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    saveStatus.textContent = "Guardado neste navegador.";
  }, 1100);
});

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeButton.textContent = isDark ? "Modo claro" : "Modo escuro";
});