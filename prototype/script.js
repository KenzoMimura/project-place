const beginButton = document.getElementById("beginButton");
const welcome = document.getElementById("welcome");
const writingArea = document.getElementById("writingArea");
const entry = document.getElementById("entry");
const saveStatus = document.getElementById("saveStatus");
const themeButton = document.getElementById("themeButton");
const dateText = document.getElementById("dateText");
const question = document.getElementById("question");
const newQuestionButton = document.getElementById("newQuestionButton");

const savedEntry = localStorage.getItem("entry");
const savedTheme = localStorage.getItem("theme");

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

function getRandomQuestion(currentQuestion = "") {
  let randomQuestion = currentQuestion;

  while (randomQuestion === currentQuestion) {
    const randomIndex = Math.floor(Math.random() * questions.length);
    randomQuestion = questions[randomIndex];
  }

  return randomQuestion;
}

function showRandomQuestion() {
  const currentQuestion = question.textContent;
  question.textContent = getRandomQuestion(currentQuestion);
}

showRandomQuestion();

newQuestionButton.addEventListener("click", () => {
  showRandomQuestion();
});