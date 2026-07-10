const STORAGE_KEY = "nimsayEntries";
const LEGACY_ENTRY_KEY = "entry";
const THEME_KEY = "theme";

const questions = [
  "O que ainda não encontrou palavras?",
  "O que ficou em você hoje?",
  "O que você está tentando entender?",
  "O que você gostaria de dizer sem medo?",
  "O que você tem sentido em silêncio?",
  "O que merece ser escrito antes de desaparecer?",
  "O que você não disse, mas ainda carrega?",
  "O que você gostaria de escutar de si mesmo?",
  "Que parte do seu dia ainda está com você?",
  "O que você tentou ignorar hoje?",
  "O que em você precisa de mais tempo?",
  "O que você sente, mas ainda não sabe explicar?",
  "Que pensamento voltou mais de uma vez?",
  "O que você gostaria de guardar deste momento?",
  "O que você diria se ninguém fosse ler?",
  "O que está pedindo para ser entendido?",
  "O que você precisa admitir para si mesmo?",
  "O que parece pequeno, mas ainda pesa?",
  "O que você gostaria de deixar ir?",
  "Por onde você gostaria de começar?"
];

const beginButton = document.getElementById("beginButton");
const welcome = document.getElementById("welcome");

const writingArea = document.getElementById("writingArea");
const archiveArea = document.getElementById("archiveArea");

const entry = document.getElementById("entry");
const question = document.getElementById("question");
const newQuestionButton = document.getElementById("newQuestionButton");

const saveStatus = document.getElementById("saveStatus");
const themeButton = document.getElementById("themeButton");
const dateText = document.getElementById("dateText");

const archiveButton = document.getElementById("archiveButton");
const backToWritingButton = document.getElementById(
  "backToWritingButton"
);
const todayButton = document.getElementById("todayButton");

const entriesList = document.getElementById("entriesList");
const emptyArchive = document.getElementById("emptyArchive");

let selectedDateKey = getTodayKey();
let currentQuestion = "";
let saveTimeout;
let isDirty = false;

/*
  Retorna a data local no formato YYYY-MM-DD.

  Evitamos usar diretamente toISOString().slice(0, 10),
  porque o formato ISO usa o horário UTC e pode retornar
  o dia anterior ou seguinte dependendo do fuso horário.
*/
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return getLocalDateKey(new Date());
}

function formatDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);

  const formattedDate = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

/*
  Lê todas as páginas do localStorage.

  Se os dados estiverem corrompidos ou ainda não existirem,
  devolvemos um objeto vazio para o site continuar funcionando.
*/
function loadEntries() {
  const savedEntries = localStorage.getItem(STORAGE_KEY);

  if (!savedEntries) {
    return {};
  }

  try {
    const parsedEntries = JSON.parse(savedEntries);

    if (
      typeof parsedEntries === "object" &&
      parsedEntries !== null &&
      !Array.isArray(parsedEntries)
    ) {
      return parsedEntries;
    }

    return {};
  } catch (error) {
    console.error("Não foi possível carregar as páginas:", error);
    return {};
  }
}

function storeEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function getRandomQuestion(previousQuestion = "") {
  if (questions.length === 1) {
    return questions[0];
  }

  let selectedQuestion = previousQuestion;

  while (selectedQuestion === previousQuestion) {
    const randomIndex = Math.floor(Math.random() * questions.length);
    selectedQuestion = questions[randomIndex];
  }

  return selectedQuestion;
}

/*
  Salva a página atualmente aberta.

  Se o texto estiver completamente vazio, a página é removida.
  Isso impede que o arquivo fique cheio de datas vazias.
*/
function saveCurrentEntry() {
  const entries = loadEntries();
  const text = entry.value;
  const now = new Date().toISOString();

  if (!text.trim()) {
    delete entries[selectedDateKey];
    storeEntries(entries);

    isDirty = false;
    return false;
  }

  const existingEntry = entries[selectedDateKey];

  entries[selectedDateKey] = {
    text,
    question: currentQuestion,
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now
  };

  storeEntries(entries);

  isDirty = false;
  return true;
}

function flushPendingSave() {
  clearTimeout(saveTimeout);

  if (!isDirty) {
    return;
  }

  const wasSaved = saveCurrentEntry();

  saveStatus.textContent = wasSaved
    ? "Guardado neste navegador."
    : "Nada guardado ainda.";
}

/*
  Abre a página correspondente a uma data.

  Se ela já existir, carregamos o texto e a pergunta.
  Caso contrário, criamos apenas uma experiência visual vazia;
  nada será salvo até que a pessoa realmente escreva.
*/
function openEntry(dateKey, shouldFocus = false) {
  flushPendingSave();

  selectedDateKey = dateKey;

  const entries = loadEntries();
  const savedEntry = entries[dateKey];

  entry.value = savedEntry?.text ?? "";

  currentQuestion =
    savedEntry?.question ?? getRandomQuestion();

  question.textContent = currentQuestion;
  dateText.textContent = formatDate(dateKey);

  saveStatus.textContent = savedEntry
    ? "Guardado neste navegador."
    : "Nada guardado ainda.";

  const isToday = dateKey === getTodayKey();
  todayButton.classList.toggle("hidden", isToday);

  welcome.classList.add("hidden");
  archiveArea.classList.add("hidden");
  writingArea.classList.remove("hidden");

  if (shouldFocus) {
    entry.focus();
  }
}

function createPreview(text) {
  const normalizedText = text
    .replace(/\s+/g, " ")
    .trim();

  if (normalizedText.length <= 100) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, 100)}…`;
}

function renderArchive() {
  const entries = loadEntries();

  const savedEntries = Object.entries(entries)
    .filter(([, savedEntry]) => savedEntry.text?.trim())
    .sort(([firstDate], [secondDate]) =>
      secondDate.localeCompare(firstDate)
    );

  entriesList.replaceChildren();

  emptyArchive.classList.toggle(
    "hidden",
    savedEntries.length > 0
  );

  savedEntries.forEach(([dateKey, savedEntry]) => {
    const entryButton = document.createElement("button");
    entryButton.className = "entry-card";
    entryButton.type = "button";

    const dateElement = document.createElement("span");
    dateElement.className = "entry-date";
    dateElement.textContent = formatDate(dateKey);

    const previewElement = document.createElement("span");
    previewElement.className = "entry-preview";
    previewElement.textContent = createPreview(savedEntry.text);

    entryButton.append(dateElement, previewElement);

    entryButton.addEventListener("click", () => {
      openEntry(dateKey, true);
    });

    entriesList.appendChild(entryButton);
  });
}

function openArchive() {
  flushPendingSave();
  renderArchive();

  welcome.classList.add("hidden");
  writingArea.classList.add("hidden");
  archiveArea.classList.remove("hidden");
}

/*
  Migra o texto salvo pela versão anterior do protótipo.

  A versão antiga usava a chave "entry".
  Se ela existir, o texto será transformado em uma página de hoje.
*/
function migrateLegacyEntry() {
  const legacyText = localStorage.getItem(LEGACY_ENTRY_KEY);

  if (!legacyText?.trim()) {
    return;
  }

  const entries = loadEntries();
  const todayKey = getTodayKey();

  if (!entries[todayKey]) {
    const now = new Date().toISOString();

    entries[todayKey] = {
      text: legacyText,
      question: questions[0],
      createdAt: now,
      updatedAt: now
    };

    storeEntries(entries);
  }

  localStorage.removeItem(LEGACY_ENTRY_KEY);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeButton.textContent = "Modo claro";
  }
}

beginButton.addEventListener("click", () => {
  openEntry(getTodayKey(), true);
});

entry.addEventListener("input", () => {
  isDirty = true;

  saveStatus.textContent = "Guardando...";

  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    const wasSaved = saveCurrentEntry();

    saveStatus.textContent = wasSaved
      ? "Guardado neste navegador."
      : "Nada guardado ainda.";
  }, 1200);
});

newQuestionButton.addEventListener("click", () => {
  currentQuestion = getRandomQuestion(currentQuestion);
  question.textContent = currentQuestion;

  /*
    Se já houver texto ou uma página previamente salva,
    guardamos também a nova pergunta.
  */
  const entries = loadEntries();

  if (
    entry.value.trim() ||
    entries[selectedDateKey]
  ) {
    isDirty = true;
    flushPendingSave();
  }
});

archiveButton.addEventListener("click", () => {
  openArchive();
});

backToWritingButton.addEventListener("click", () => {
  openEntry(selectedDateKey);
});

todayButton.addEventListener("click", () => {
  openEntry(getTodayKey(), true);
});

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  localStorage.setItem(
    THEME_KEY,
    isDark ? "dark" : "light"
  );

  themeButton.textContent = isDark
    ? "Modo claro"
    : "Modo escuro";
});

/*
  Garante que o texto seja guardado caso a pessoa feche
  ou atualize a página antes do debounce terminar.
*/
window.addEventListener("beforeunload", () => {
  flushPendingSave();
});

migrateLegacyEntry();
applySavedTheme();