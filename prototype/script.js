const STORAGE_KEY = "nimsayWritings";
const DATED_ENTRIES_KEY = "nimsayEntries";
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
const writingTitle = document.getElementById("writingTitle");
const question = document.getElementById("question");
const newQuestionButton = document.getElementById("newQuestionButton");

const saveStatus = document.getElementById("saveStatus");
const themeButton = document.getElementById("themeButton");
const dateText = document.getElementById("dateText");

const archiveButton = document.getElementById("archiveButton");
const backToWritingButton = document.getElementById(
  "backToWritingButton"
);
const newWritingButton = document.getElementById("newWritingButton");
const archiveNewWritingButton = document.getElementById(
  "archiveNewWritingButton"
);
const finishButton = document.getElementById("finishButton");

const entriesList = document.getElementById("entriesList");
const emptyArchive = document.getElementById("emptyArchive");

let currentWritingId = null;
let currentCreatedOn = getTodayKey();
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
  Lê todas as escritas independentes do localStorage.

  Agora usamos um array porque a data deixou de ser o identificador.
  Cada escrita possui seu próprio id e pode compartilhar a mesma data
  de criação com outras escritas.
*/
function loadWritings() {
  const savedWritings = localStorage.getItem(STORAGE_KEY);

  if (!savedWritings) {
    return [];
  }

  try {
    const parsedWritings = JSON.parse(savedWritings);

    if (Array.isArray(parsedWritings)) {
      return parsedWritings;
    }

    return [];
  } catch (error) {
    console.error("Não foi possível carregar as páginas:", error);
    return [];
  }
}

function storeWritings(writings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(writings));
}

function createWritingId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `writing-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function getCurrentWriting(writings = loadWritings()) {
  return writings.find(
    (writing) => writing.id === currentWritingId
  );
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

function getSavedStatus(writing) {
  if (writing?.status === "completed") {
    return "Guardado neste navegador. Escrita finalizada.";
  }

  return "Guardado neste navegador.";
}

function updateFinishButton(writing = getCurrentWriting()) {
  const isCompleted = writing?.status === "completed";
  const hasText = Boolean(entry.value.trim());

  finishButton.textContent = isCompleted
    ? "Finalizada"
    : "Finalizar";

  finishButton.disabled = !hasText || isCompleted;
}

function showWritingArea(shouldFocus = false) {
  welcome.classList.add("hidden");
  archiveArea.classList.add("hidden");
  writingArea.classList.remove("hidden");

  if (shouldFocus) {
    entry.focus();
  }
}

/*
  Salva a escrita atualmente aberta.

  Um id é criado somente quando existe texto de verdade. Assim,
  abrir uma nova escrita e sair sem digitar não cria rascunhos vazios.
*/
function saveCurrentWriting() {
  const writings = loadWritings();
  const text = entry.value;
  const now = new Date().toISOString();
  const existingIndex = writings.findIndex(
    (writing) => writing.id === currentWritingId
  );

  if (!text.trim()) {
    if (existingIndex >= 0) {
      writings.splice(existingIndex, 1);
      storeWritings(writings);
    }

    currentWritingId = null;
    currentCreatedOn = getTodayKey();
    dateText.textContent = formatDate(currentCreatedOn);
    isDirty = false;
    updateFinishButton();

    return null;
  }

  const existingWriting = writings[existingIndex];
  const savedWriting = {
    id: existingWriting?.id ?? createWritingId(),
    title: writingTitle.value.trim(),
    text,
    question: currentQuestion,
    status: existingWriting?.status ?? "draft",
    createdOn: existingWriting?.createdOn ?? currentCreatedOn,
    createdAt: existingWriting?.createdAt ?? now,
    updatedAt: now,
    completedAt: existingWriting?.completedAt ?? null
  };

  if (existingIndex >= 0) {
    writings[existingIndex] = savedWriting;
  } else {
    writings.push(savedWriting);
  }

  storeWritings(writings);

  currentWritingId = savedWriting.id;
  currentCreatedOn = savedWriting.createdOn;
  dateText.textContent = formatDate(savedWriting.createdOn);
  isDirty = false;
  updateFinishButton(savedWriting);

  return savedWriting;
}

function flushPendingSave() {
  clearTimeout(saveTimeout);

  if (!isDirty) {
    return getCurrentWriting();
  }

  const savedWriting = saveCurrentWriting();

  saveStatus.textContent = savedWriting
    ? getSavedStatus(savedWriting)
    : "Nada guardado ainda.";

  return savedWriting;
}

function openNewWriting(shouldFocus = false) {
  flushPendingSave();

  currentWritingId = null;
  currentCreatedOn = getTodayKey();
  currentQuestion = getRandomQuestion();

  entry.value = "";
  writingTitle.value = "";
  question.textContent = currentQuestion;
  dateText.textContent = formatDate(currentCreatedOn);
  saveStatus.textContent = "Nada guardado ainda.";

  updateFinishButton();
  showWritingArea(shouldFocus);
}

function openWriting(writingId, shouldFocus = false) {
  flushPendingSave();

  const writings = loadWritings();
  const savedWriting = writings.find(
    (writing) => writing.id === writingId
  );

  if (!savedWriting) {
    openNewWriting(shouldFocus);
    return;
  }

  currentWritingId = savedWriting.id;
  currentCreatedOn = savedWriting.createdOn;
  currentQuestion = savedWriting.question ?? getRandomQuestion();

  entry.value = savedWriting.text;
  writingTitle.value = savedWriting.title ?? "";
  question.textContent = currentQuestion;
  dateText.textContent = formatDate(savedWriting.createdOn);
  saveStatus.textContent = getSavedStatus(savedWriting);

  updateFinishButton(savedWriting);
  showWritingArea(shouldFocus);
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

function getWritingIdentifier(writing) {
  return writing.title?.trim() || formatDate(writing.createdOn);
}

function renderArchive() {
  const savedWritings = loadWritings()
    .filter((writing) => writing.text?.trim())
    .sort((firstWriting, secondWriting) =>
      secondWriting.createdAt.localeCompare(
        firstWriting.createdAt
      )
    );

  entriesList.replaceChildren();

  emptyArchive.classList.toggle(
    "hidden",
    savedWritings.length > 0
  );

  savedWritings.forEach((savedWriting) => {
    const entryRow = document.createElement("div");
    entryRow.className = "entry-row";

    const entryButton = document.createElement("button");
    entryButton.className = "entry-card";
    entryButton.type = "button";

    const metaElement = document.createElement("span");
    metaElement.className = "entry-meta";

    const hasTitle = Boolean(savedWriting.title?.trim());
    const identifierElement = document.createElement("span");
    identifierElement.className = hasTitle
      ? "entry-title"
      : "entry-date";
    identifierElement.textContent = getWritingIdentifier(savedWriting);

    metaElement.appendChild(identifierElement);

    if (savedWriting.status === "draft") {
      const statusElement = document.createElement("span");
      statusElement.className = "entry-status";
      statusElement.textContent = "Rascunho";
      metaElement.appendChild(statusElement);
    }

    const previewElement = document.createElement("span");
    previewElement.className = "entry-preview";
    previewElement.textContent = createPreview(savedWriting.text);

    entryButton.appendChild(metaElement);
    entryButton.appendChild(previewElement);

    entryButton.addEventListener("click", () => {
      openWriting(savedWriting.id, true);
    });

    const downloadButton = document.createElement("button");
    downloadButton.className = "download-button";
    downloadButton.type = "button";
    downloadButton.textContent = "↓";
    downloadButton.title = "Baixar em PDF";
    downloadButton.setAttribute(
      "aria-label",
      `Baixar ${getWritingIdentifier(savedWriting)} em PDF`
    );

    downloadButton.addEventListener("click", () => {
      try {
        window.NimsayPdf.downloadWritingPdf(savedWriting);
      } catch (error) {
        console.error("Não foi possível criar o PDF:", error);
      }
    });

    entryRow.append(entryButton, downloadButton);
    entriesList.appendChild(entryRow);
  });
}

function openArchive() {
  flushPendingSave();
  renderArchive();

  welcome.classList.add("hidden");
  writingArea.classList.add("hidden");
  archiveArea.classList.remove("hidden");
}

function loadDatedEntries() {
  const savedEntries = localStorage.getItem(DATED_ENTRIES_KEY);

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
    console.error("Não foi possível migrar as páginas:", error);
    return {};
  }
}

/*
  Migra as duas versões anteriores do armazenamento:

  - "entry": guardava somente um texto;
  - "nimsayEntries": guardava uma página para cada data.

  As chaves antigas só são removidas depois que o novo array é salvo.
*/
function migrateLegacyData() {
  if (localStorage.getItem(STORAGE_KEY) !== null) {
    return;
  }

  const todayKey = getTodayKey();
  const datedEntries = loadDatedEntries();
  const migratedWritings = Object.entries(datedEntries)
    .filter(([, savedEntry]) => savedEntry.text?.trim())
    .map(([dateKey, savedEntry]) => {
      const fallbackDate = new Date(
        `${dateKey}T12:00:00`
      ).toISOString();
      const isToday = dateKey === todayKey;

      return {
        id: createWritingId(),
        title: "",
        text: savedEntry.text,
        question: savedEntry.question ?? questions[0],
        status: isToday ? "draft" : "completed",
        createdOn: dateKey,
        createdAt: savedEntry.createdAt ?? fallbackDate,
        updatedAt: savedEntry.updatedAt ?? fallbackDate,
        completedAt: isToday
          ? null
          : savedEntry.updatedAt ?? fallbackDate
      };
    });

  const legacyText = localStorage.getItem(LEGACY_ENTRY_KEY);
  const legacyAlreadyMigrated = migratedWritings.some(
    (writing) => writing.text === legacyText
  );

  if (legacyText?.trim() && !legacyAlreadyMigrated) {
    const now = new Date().toISOString();

    migratedWritings.push({
      id: createWritingId(),
      title: "",
      text: legacyText,
      question: questions[0],
      status: "draft",
      createdOn: todayKey,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    });
  }

  storeWritings(migratedWritings);
  localStorage.removeItem(DATED_ENTRIES_KEY);
  localStorage.removeItem(LEGACY_ENTRY_KEY);
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeButton.textContent = "Modo claro";
  }
}

function scheduleSave() {
  isDirty = true;
  saveStatus.textContent = "Guardando...";

  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    const savedWriting = saveCurrentWriting();

    saveStatus.textContent = savedWriting
      ? getSavedStatus(savedWriting)
      : "Nada guardado ainda.";
  }, 1200);
}

beginButton.addEventListener("click", () => {
  openNewWriting(true);
});

entry.addEventListener("input", () => {
  updateFinishButton();
  scheduleSave();
});

writingTitle.addEventListener("input", () => {
  scheduleSave();
});

newQuestionButton.addEventListener("click", () => {
  currentQuestion = getRandomQuestion(currentQuestion);
  question.textContent = currentQuestion;

  /*
    Se já houver texto ou uma página previamente salva,
    guardamos também a nova pergunta.
  */
  if (entry.value.trim() || getCurrentWriting()) {
    isDirty = true;
    flushPendingSave();
  }
});

archiveButton.addEventListener("click", () => {
  openArchive();
});

backToWritingButton.addEventListener("click", () => {
  const currentWriting = getCurrentWriting();

  if (currentWriting) {
    openWriting(currentWriting.id);
    return;
  }

  openNewWriting();
});

newWritingButton.addEventListener("click", () => {
  openNewWriting(true);
});

archiveNewWritingButton.addEventListener("click", () => {
  openNewWriting(true);
});

finishButton.addEventListener("click", () => {
  const savedWriting = flushPendingSave();

  if (!savedWriting) {
    saveStatus.textContent =
      "Escreva algo antes de finalizar.";
    updateFinishButton();
    return;
  }

  const writings = loadWritings();
  const writingIndex = writings.findIndex(
    (writing) => writing.id === savedWriting.id
  );

  if (writingIndex < 0) {
    return;
  }

  const now = new Date().toISOString();
  const completedWriting = {
    ...writings[writingIndex],
    status: "completed",
    updatedAt: now,
    completedAt: now
  };

  writings[writingIndex] = completedWriting;
  storeWritings(writings);

  saveStatus.textContent =
    "Escrita finalizada e guardada neste navegador.";
  updateFinishButton(completedWriting);
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

migrateLegacyData();
applySavedTheme();
