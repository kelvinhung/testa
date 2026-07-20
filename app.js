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
  progressLine: $("progressLine"),
  btnResetProgress: $("btnResetProgress"),
};

const SEEN_STORAGE_KEY = "practiceSeenByPool";

function poolKey() {
  return `${subject}:${els.filterSelect.value || "all"}`;
}

function loadSeenMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSeenMap(map) {
  localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(map));
}

function getSeenIds() {
  const map = loadSeenMap();
  const list = map[poolKey()];
  return new Set(Array.isArray(list) ? list : []);
}

function saveSeenIds(seen) {
  const map = loadSeenMap();
  map[poolKey()] = [...seen];
  saveSeenMap(map);
}

function questionId(entry) {
  if (!entry) return "";
  if (entry.mode === "math") {
    return `m-${entry.chapterId}-${entry.topicName}-${entry.questionIndex}`;
  }
  if (entry.mode === "english") {
    return `e-${entry.gradeId}-${entry.wordIndex}`;
  }
  if (entry.mode === "chinese" || entry.mode === "bible") {
    return `${entry.mode[0]}-${entry.itemId}`;
  }
  return "";
}

function sameQuestion(a, b) {
  if (!a || !b) return false;
  return questionId(a) === questionId(b);
}

function updateProgressDisplay() {
  if (!els.progressLine) return;
  const pool = getPool();
  const total = pool.length;
  if (!total) {
    els.progressLine.textContent = "0/0";
    return;
  }
  const poolIds = new Set(pool.map(questionId));
  const seen = getSeenIds();
  let count = 0;
  for (const id of seen) {
    if (poolIds.has(id)) count++;
  }
  els.progressLine.textContent = `${count}/${total}`;
}

function markSeen(entry) {
  if (!entry) return;
  const id = questionId(entry);
  if (!id) return;
  const seen = getSeenIds();
  if (!seen.has(id)) {
    seen.add(id);
    saveSeenIds(seen);
  }
  updateProgressDisplay();
}

function resetCurrentProgress() {
  saveSeenIds(new Set());
  updateProgressDisplay();
  renderQuestion(pickRandom());
}

const CHINESE_CATEGORY_LABELS = {
  pinyin: "Pinyin 拼音",
  vocabulary: "Words 词汇",
  dialogue: "Text 课文",
};

const BIBLE_CATEGORY_LABELS = {
  courage: "Confidence & Fear",
  kindness: "Kindness & Words",
  family: "Family & Home",
  school: "School & Friends",
  screens: "Screens & Games",
  habits: "Habits & Adventure",
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

  const seen = getSeenIds();
  let candidates = pool.filter((entry) => !seen.has(questionId(entry)));

  // Auto-reset when every question in this category has been viewed
  if (!candidates.length) {
    saveSeenIds(new Set());
    candidates = pool.slice();
  }

  if (candidates.length === 1) return candidates[0];

  let filtered = candidates;
  if (exclude) {
    const without = candidates.filter((entry) => !sameQuestion(entry, exclude));
    if (without.length) filtered = without;
  }

  return filtered[Math.floor(Math.random() * filtered.length)];
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
    updateProgressDisplay();
    return;
  }

  current = entry;
  markSeen(entry);

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
  } else if (subject === "chinese") {
    for (const cat of chineseData.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.label;
      els.filterSelect.appendChild(opt);
    }
  } else {
    for (const cat of bibleData.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.label;
      els.filterSelect.appendChild(opt);
    }
  }
  updateProgressDisplay();
}

function setSubject(next) {
  subject = next;
  updateSubjectUI();
  updateExplainLabels();
  populateFilter();
  renderQuestion(pickRandom());
}

function init() {
  els.btnMath.addEventListener("click", () => setSubject("math"));
  els.btnEnglish.addEventListener("click", () => setSubject("english"));
  els.btnChinese.addEventListener("click", () => setSubject("chinese"));
  els.btnBible.addEventListener("click", () => setSubject("bible"));
  els.btnAnswer.addEventListener("click", handleAnswer);
  els.filterSelect.addEventListener("change", () => {
    updateProgressDisplay();
    renderQuestion(pickRandom());
  });
  els.btnResetProgress.addEventListener("click", resetCurrentProgress);
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
