/** Math + English + Chinese + Bible practice */

let mathData = null;
let vocabData = null;
let chineseData = null;
let bibleData = null;
let subject = "math"; // "math" | "english" | "chinese" | "bible"
/** @type {object|null} */
let current = null;

const $ = (id) => document.getElementById(id);

const els = {
  btnMath: $("btnMath"),
  btnEnglish: $("btnEnglish"),
  btnChinese: $("btnChinese"),
  btnBible: $("btnBible"),
  filterSelect: $("filterSelect"),
  metaLine: $("metaLine"),
  questionText: $("questionText"),
  choicesList: $("choicesList"),
  explainPanel: $("explainPanel"),
  explainLabel1: $("explainLabel1"),
  explainLabel2: $("explainLabel2"),
  keyIdea: $("keyIdea"),
  exampleText: $("exampleText"),
  answerPanel: $("answerPanel"),
  answerLabel: $("answerLabel"),
  answerText: $("answerText"),
  btnAnswer: $("btnAnswer"),
  chineseTableWrap: $("chineseTableWrap"),
  chineseTableBody: $("chineseTableBody"),
  statsLine: $("statsLine"),
  timerLine: $("timerLine"),
  btnResetTimer: $("btnResetTimer"),
};

const TIMER_STORAGE_KEY = "practiceTimeBySubject";
const SUBJECTS = ["math", "english", "chinese", "bible"];

/** @type {Record<string, number>} */
let timeBySubject = loadTimeBySubject();
let timerStartedAt = null;
let timerInterval = null;

function loadTimeBySubject() {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const out = {};
    for (const key of SUBJECTS) {
      out[key] = Number(parsed[key]) || 0;
    }
    return out;
  } catch {
    return { math: 0, english: 0, chinese: 0, bible: 0 };
  }
}

function saveTimeBySubject() {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timeBySubject));
}

function formatDuration(ms) {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function flushActiveTimer() {
  if (!timerStartedAt || !subject) return;
  const now = Date.now();
  timeBySubject[subject] = (timeBySubject[subject] || 0) + (now - timerStartedAt);
  timerStartedAt = now;
  saveTimeBySubject();
}

function currentSubjectElapsed() {
  let ms = timeBySubject[subject] || 0;
  if (timerStartedAt) ms += Date.now() - timerStartedAt;
  return ms;
}

function updateTimerDisplay() {
  if (!els.timerLine) return;
  els.timerLine.textContent = `Time ${formatDuration(currentSubjectElapsed())}`;
}

function startSubjectTimer() {
  flushActiveTimer();
  timerStartedAt = document.hidden ? null : Date.now();
  updateTimerDisplay();
}

function pauseSubjectTimer() {
  flushActiveTimer();
  timerStartedAt = null;
  updateTimerDisplay();
}

function resumeSubjectTimer() {
  if (!document.hidden && !timerStartedAt) {
    timerStartedAt = Date.now();
  }
  updateTimerDisplay();
}

function resetCurrentSubjectTimer() {
  timeBySubject[subject] = 0;
  timerStartedAt = document.hidden ? null : Date.now();
  saveTimeBySubject();
  updateTimerDisplay();
}

function initTimer() {
  startSubjectTimer();
  timerInterval = setInterval(() => {
    if (!document.hidden && timerStartedAt) updateTimerDisplay();
  }, 1000);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseSubjectTimer();
    else resumeSubjectTimer();
  });

  window.addEventListener("pagehide", flushActiveTimer);
  window.addEventListener("beforeunload", flushActiveTimer);
}

const CHINESE_CATEGORY_LABELS = {
  pinyin: "Pinyin 拼音",
  vocabulary: "Words 词汇",
  dialogue: "Text 课文",
};

const BIBLE_CATEGORY_LABELS = {
  courage: "Be Brave",
  stories: "Epic Stories",
  verses: "Power Verses",
  "real-life": "Real Life",
  identity: "Who You Are",
};

function buildMathPool(filter) {
  const pool = [];
  for (const ch of mathData.chapters) {
    if (filter !== "all" && ch.id !== Number(filter)) continue;
    for (const sec of ch.sections) {
      for (const topic of sec.topics) {
        topic.questions.forEach((q, qi) => {
          pool.push({
            mode: "math",
            chapterId: ch.id,
            chapterTitle: ch.title,
            sectionTitle: sec.title,
            topicName: topic.name,
            keyIdea: topic.keyIdea,
            example: topic.example,
            question: q.text,
            answer: q.answer || "(see ebook)",
            questionIndex: qi,
            topicQuestions: topic.questions,
          });
        });
      }
    }
  }
  return pool;
}

function buildEnglishPool(filter) {
  const pool = [];
  for (const grade of vocabData.grades) {
    if (filter !== "all" && grade.id !== Number(filter)) continue;
    grade.words.forEach((w, wi) => {
      pool.push({
        mode: "english",
        gradeId: grade.id,
        gradeTitle: grade.title,
        word: w.word,
        definition: w.definition,
        examples: w.examples,
        question: `What does "${w.word}" mean?`,
        answer: w.definition,
        keyIdea: w.definition,
        example: w.examples.join(" "),
        wordIndex: wi,
        gradeWords: grade.words,
      });
    });
  }
  return pool;
}

function buildChinesePool(filter) {
  const pool = [];
  for (const item of chineseData.items) {
    if (filter !== "all" && item.category !== filter) continue;
    pool.push({
      mode: "chinese",
      itemId: item.id,
      category: item.category,
      prompt: item.prompt,
      pinyin: item.pinyin,
      hanzi: item.hanzi,
      english: item.english,
      label1: item.label1,
      label2: item.label2,
      labelAnswer: item.labelAnswer,
      hideMeaning: item.hideMeaning,
      lessonTitle: chineseData.meta.title,
    });
  }
  return pool;
}

function buildBiblePool(filter) {
  const pool = [];
  for (const item of bibleData.items) {
    if (filter !== "all" && item.category !== filter) continue;
    pool.push({
      mode: "bible",
      itemId: item.id,
      category: item.category,
      prompt: item.prompt,
      keyIdea: item.verse,
      example: item.takeaway,
      answer: item.answer,
      choices: item.choices || [],
    });
  }
  return pool;
}

function getPool() {
  if (subject === "math") return buildMathPool(els.filterSelect.value);
  if (subject === "english") return buildEnglishPool(els.filterSelect.value);
  if (subject === "chinese") return buildChinesePool(els.filterSelect.value);
  if (subject === "bible") return buildBiblePool(els.filterSelect.value);
  return [];
}

function pickRandom(exclude = null) {
  const pool = getPool();
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];

  let candidate;
  let attempts = 0;
  do {
    candidate = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
    if (!exclude) break;
    if (subject === "math") {
      const same =
        candidate.chapterId === exclude.chapterId &&
        candidate.topicName === exclude.topicName &&
        candidate.questionIndex === exclude.questionIndex;
      if (!same) break;
    } else if (subject === "english") {
      const same =
        candidate.gradeId === exclude.gradeId &&
        candidate.wordIndex === exclude.wordIndex;
      if (!same) break;
    } else if (candidate.itemId !== exclude.itemId) {
      break;
    }
  } while (attempts < 40);

  return candidate;
}

function hidePanels() {
  els.explainPanel.classList.add("hidden");
  els.answerPanel.classList.add("hidden");
  els.chineseTableWrap.classList.add("hidden");
  els.choicesList.classList.add("hidden");
  els.choicesList.innerHTML = "";
  els.btnAnswer.classList.remove("active");
  if (subject !== "chinese") {
    els.btnAnswer.querySelector(".btn-short").textContent = "Answer";
  }
  els.exampleText.textContent = "";
  els.answerText.textContent = "";
  els.keyIdea.textContent = "";
  els.chineseTableBody.innerHTML = "";
  els.exampleText.closest(".explain-block")?.classList.remove("hidden");
}

function showBibleChoices(entry) {
  els.choicesList.innerHTML = "";
  const choices = [...(entry.choices || [])];
  if (!choices.length) {
    els.choicesList.classList.add("hidden");
    return;
  }
  // Shuffle so the correct answer isn't always first
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  for (const choice of choices) {
    const li = document.createElement("li");
    li.className = "choice-item";
    li.textContent = choice;
    els.choicesList.appendChild(li);
  }
  els.choicesList.classList.remove("hidden");
}

function splitChineseLines(text) {
  return (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function showChineseContent(entry) {
  const hanzi = splitChineseLines(entry.hanzi);
  const pinyin = splitChineseLines(entry.pinyin);
  const english = entry.hideMeaning ? [] : splitChineseLines(entry.english);
  const rows = Math.max(hanzi.length, pinyin.length, english.length, 1);

  els.chineseTableBody.innerHTML = "";
  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");
    const cells = [
      hanzi[i] || "—",
      pinyin[i] || "—",
      entry.hideMeaning ? "—" : english[i] || "—",
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.appendChild(td);
    }
    els.chineseTableBody.appendChild(tr);
  }

  els.explainPanel.classList.add("hidden");
  els.answerPanel.classList.add("hidden");
  els.chineseTableWrap.classList.remove("hidden");
}

function setAnswerButtonLabel() {
  const label = subject === "chinese" ? "Next" : "Answer";
  els.btnAnswer.querySelector(".btn-short").textContent = label;
  els.btnAnswer.title =
    subject === "chinese"
      ? "Go to next item"
      : "Show explanation and answer";
}

function updateExplainLabels() {
  if (subject === "english") {
    els.explainLabel1.textContent = "Definition";
    els.explainLabel2.textContent = "Example sentences";
    els.answerLabel.textContent = "Example sentences";
  } else if (subject === "chinese") {
    // Table layout uses fixed Chinese / Pinyin / English headers
  } else if (subject === "bible") {
    els.explainLabel1.textContent = "Verse";
    els.explainLabel2.textContent = "Why it matters";
    els.answerLabel.textContent = "Answer";
  } else {
    els.explainLabel1.textContent = "Key idea";
    els.explainLabel2.textContent = "Example";
    els.answerLabel.textContent = "Answer";
  }
}

function updateSubjectUI() {
  document.body.classList.toggle("english-mode", subject === "english");
  document.body.classList.toggle("chinese-mode", subject === "chinese");
  document.body.classList.toggle("bible-mode", subject === "bible");
  els.btnMath.classList.toggle("active", subject === "math");
  els.btnEnglish.classList.toggle("active", subject === "english");
  els.btnChinese.classList.toggle("active", subject === "chinese");
  els.btnBible.classList.toggle("active", subject === "bible");
  els.btnMath.setAttribute("aria-selected", subject === "math");
  els.btnEnglish.setAttribute("aria-selected", subject === "english");
  els.btnChinese.setAttribute("aria-selected", subject === "chinese");
  els.btnBible.setAttribute("aria-selected", subject === "bible");
  els.questionText.classList.toggle("chinese-prompt", subject === "chinese");
  els.questionText.classList.toggle("bible-prompt", subject === "bible");
  setAnswerButtonLabel();
}

function showReveal() {
  if (subject === "english") {
    els.keyIdea.textContent = current.keyIdea || "—";
    if (current.examples?.length) {
      els.answerText.innerHTML = current.examples.map((s) => `• ${s}`).join("<br>");
    } else {
      els.answerText.textContent = "—";
    }
  } else {
    els.keyIdea.textContent = current.keyIdea || "—";
    els.exampleText.textContent = current.example || "—";
    els.answerText.textContent = current.answer || "—";
  }

  if (subject === "bible" && current.choices?.length) {
    for (const li of els.choicesList.querySelectorAll(".choice-item")) {
      li.classList.toggle("correct", li.textContent === current.answer);
    }
  }

  els.explainPanel.classList.remove("hidden");
  els.answerPanel.classList.remove("hidden");
  els.btnAnswer.classList.add("active");
  els.btnAnswer.querySelector(".btn-short").textContent = "Next";
}

function renderQuestion(entry) {
  if (!entry) {
    els.metaLine.textContent = "No items";
    els.questionText.textContent = "Try another filter.";
    els.questionText.classList.remove("word-prompt", "chinese-prompt", "bible-prompt");
    return;
  }

  current = entry;

  if (subject === "chinese") {
    els.metaLine.textContent = `${entry.lessonTitle} · ${CHINESE_CATEGORY_LABELS[entry.category] || entry.category}`;
    els.questionText.textContent = entry.prompt;
    els.questionText.classList.remove("word-prompt", "bible-prompt");
    els.questionText.classList.add("chinese-prompt");
    showChineseContent(entry);
    els.btnAnswer.classList.remove("active");
    setAnswerButtonLabel();
    return;
  }

  hidePanels();

  if (subject === "english") {
    els.metaLine.textContent = `${entry.gradeTitle} · Vocabulary`;
    els.questionText.textContent = entry.word;
    els.questionText.classList.add("word-prompt");
    els.questionText.classList.remove("chinese-prompt", "bible-prompt");
  } else if (subject === "bible") {
    els.metaLine.textContent = `Bible · ${BIBLE_CATEGORY_LABELS[entry.category] || entry.category}`;
    els.questionText.textContent = entry.prompt;
    els.questionText.classList.remove("word-prompt", "chinese-prompt");
    els.questionText.classList.add("bible-prompt");
    showBibleChoices(entry);
  } else {
    els.metaLine.textContent = `Ch ${entry.chapterId}: ${entry.chapterTitle} · ${entry.topicName}`;
    els.questionText.textContent = entry.question;
    els.questionText.classList.remove("word-prompt", "chinese-prompt", "bible-prompt");
  }
}

function handleAnswer() {
  if (!current) return;

  if (subject === "chinese") {
    renderQuestion(pickRandom(current));
    return;
  }

  const revealed = !els.explainPanel.classList.contains("hidden");
  if (revealed) {
    renderQuestion(pickRandom(current));
  } else {
    showReveal();
  }
}

function populateFilter() {
  els.filterSelect.innerHTML = "";

  if (subject === "math") {
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All chapters";
    els.filterSelect.appendChild(all);
    for (const ch of mathData.chapters) {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = `Ch ${ch.id}: ${ch.title}`;
      els.filterSelect.appendChild(opt);
    }
    const total = mathData.meta?.totalQuestions ?? getPool().length;
    els.statsLine.textContent = `${total} math questions · ${mathData.chapters.length} chapters`;
  } else if (subject === "english") {
    const all = document.createElement("option");
    all.value = "all";
    all.textContent = "All grades";
    els.filterSelect.appendChild(all);
    for (const g of vocabData.grades) {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = `${g.title} (${g.words.length} words)`;
      els.filterSelect.appendChild(opt);
    }
    const total = vocabData.meta?.totalWords ?? getPool().length;
    els.statsLine.textContent = `${total} vocabulary words · 5th & 6th grade`;
  } else if (subject === "chinese") {
    for (const cat of chineseData.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.label;
      els.filterSelect.appendChild(opt);
    }
    const total = chineseData.items.length;
    els.statsLine.textContent = `${total} items · ${chineseData.meta.title}`;
  } else {
    for (const cat of bibleData.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.label;
      els.filterSelect.appendChild(opt);
    }
    const total = bibleData.items.length;
    els.statsLine.textContent = `${total} cards · ${bibleData.meta.title}`;
  }
}

function setSubject(next) {
  flushActiveTimer();
  subject = next;
  updateSubjectUI();
  updateExplainLabels();
  populateFilter();
  renderQuestion(pickRandom());
  startSubjectTimer();
}

function init() {
  els.btnMath.addEventListener("click", () => setSubject("math"));
  els.btnEnglish.addEventListener("click", () => setSubject("english"));
  els.btnChinese.addEventListener("click", () => setSubject("chinese"));
  els.btnBible.addEventListener("click", () => setSubject("bible"));
  els.btnAnswer.addEventListener("click", handleAnswer);
  els.filterSelect.addEventListener("change", () => renderQuestion(pickRandom()));
  els.btnResetTimer.addEventListener("click", resetCurrentSubjectTimer);
  initTimer();
}

async function load() {
  try {
    const [mathRes, vocabRes, chineseRes, bibleRes] = await Promise.all([
      fetch("flashcards.json"),
      fetch("vocabulary.json"),
      fetch("chinese-lesson1.json"),
      fetch("bible.json"),
    ]);
    if (!mathRes.ok || !vocabRes.ok || !chineseRes.ok || !bibleRes.ok) {
      throw new Error("Failed to load data");
    }
    mathData = await mathRes.json();
    vocabData = await vocabRes.json();
    chineseData = await chineseRes.json();
    bibleData = await bibleRes.json();
    init();
    setSubject("math");
  } catch (err) {
    els.questionText.textContent = "Could not load. Run a local server in prealgebra-practice/.";
    console.error(err);
  }
}

load();
