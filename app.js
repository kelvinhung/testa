/** Math + English + Chinese practice */

let mathData = null;
let vocabData = null;
let chineseData = null;
let subject = "math"; // "math" | "english" | "chinese"
/** @type {object|null} */
let current = null;
let chineseVoice = null;

const $ = (id) => document.getElementById(id);

const els = {
  btnMath: $("btnMath"),
  btnEnglish: $("btnEnglish"),
  btnChinese: $("btnChinese"),
  filterSelect: $("filterSelect"),
  metaLine: $("metaLine"),
  questionText: $("questionText"),
  explainPanel: $("explainPanel"),
  explainLabel1: $("explainLabel1"),
  explainLabel2: $("explainLabel2"),
  keyIdea: $("keyIdea"),
  exampleText: $("exampleText"),
  answerPanel: $("answerPanel"),
  answerLabel: $("answerLabel"),
  answerText: $("answerText"),
  btnAnswer: $("btnAnswer"),
  btnSound: $("btnSound"),
  statsLine: $("statsLine"),
};

const CHINESE_SPEECH_RATE = 0.6;

const CATEGORY_LABELS = {
  pinyin: "Pinyin 拼音",
  vocabulary: "Words 词汇",
  dialogue: "Text 课文",
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
      speak: item.speak,
      speakSequence: item.speakSequence,
      label1: item.label1,
      label2: item.label2,
      labelAnswer: item.labelAnswer,
      hideMeaning: item.hideMeaning,
      lessonTitle: chineseData.meta.title,
    });
  }
  return pool;
}

function getPool() {
  if (subject === "math") return buildMathPool(els.filterSelect.value);
  if (subject === "english") return buildEnglishPool(els.filterSelect.value);
  return buildChinesePool(els.filterSelect.value);
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
    } else {
      if (candidate.itemId !== exclude.itemId) break;
    }
  } while (attempts < 40);

  return candidate;
}

function initChineseVoice() {
  const pick = () => {
    const voices = speechSynthesis.getVoices();
    chineseVoice =
      voices.find((v) => v.lang === "zh-CN") ||
      voices.find((v) => v.lang.startsWith("zh")) ||
      null;
  };
  pick();
  speechSynthesis.addEventListener("voiceschanged", pick);
}

function speakChinese(text, entry = null) {
  if (entry?.speakSequence?.length) {
    speechSynthesis.cancel();
    let i = 0;
    const speakNext = () => {
      if (i >= entry.speakSequence.length) return;
      const utter = new SpeechSynthesisUtterance(entry.speakSequence[i++]);
      utter.lang = "zh-CN";
      utter.rate = CHINESE_SPEECH_RATE;
      if (chineseVoice) utter.voice = chineseVoice;
      utter.onend = speakNext;
      speechSynthesis.speak(utter);
    };
    speakNext();
    return;
  }
  if (!text) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "zh-CN";
  utter.rate = CHINESE_SPEECH_RATE;
  if (chineseVoice) utter.voice = chineseVoice;
  speechSynthesis.speak(utter);
}

function hidePanels() {
  els.explainPanel.classList.add("hidden");
  els.answerPanel.classList.add("hidden");
  els.btnAnswer.classList.remove("active");
  if (subject !== "chinese") {
    els.btnAnswer.querySelector(".btn-short").textContent = "Answer";
  }
  els.exampleText.textContent = "";
  els.answerText.textContent = "";
  els.keyIdea.textContent = "";
  els.exampleText.closest(".explain-block")?.classList.remove("hidden");
}

function showChineseContent(entry) {
  const meaningBlock = els.exampleText.closest(".explain-block");
  els.explainLabel1.textContent = entry.label1 || "Pinyin";
  els.explainLabel2.textContent = entry.label2 || "Meaning";
  els.answerLabel.textContent = entry.labelAnswer || "Chinese";
  meaningBlock.classList.toggle("hidden", Boolean(entry.hideMeaning));

  els.keyIdea.textContent = entry.pinyin || "—";
  els.exampleText.textContent = entry.english || "—";
  els.answerText.textContent = entry.hanzi || "—";
  els.explainPanel.classList.remove("hidden");
  els.answerPanel.classList.remove("hidden");
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
    els.explainLabel1.textContent = "Pinyin";
    els.explainLabel2.textContent = "Meaning";
    els.answerLabel.textContent = "Chinese";
  } else {
    els.explainLabel1.textContent = "Key idea";
    els.explainLabel2.textContent = "Example";
    els.answerLabel.textContent = "Answer";
  }
}

function updateSubjectUI() {
  document.body.classList.toggle("english-mode", subject === "english");
  document.body.classList.toggle("chinese-mode", subject === "chinese");
  els.btnMath.classList.toggle("active", subject === "math");
  els.btnEnglish.classList.toggle("active", subject === "english");
  els.btnChinese.classList.toggle("active", subject === "chinese");
  els.btnMath.setAttribute("aria-selected", subject === "math");
  els.btnEnglish.setAttribute("aria-selected", subject === "english");
  els.btnChinese.setAttribute("aria-selected", subject === "chinese");
  els.btnSound.classList.toggle("hidden", subject !== "chinese");
  els.questionText.classList.toggle("chinese-prompt", subject === "chinese");
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
    els.questionText.classList.remove("word-prompt", "chinese-prompt");
    return;
  }

  current = entry;

  if (subject === "chinese") {
    els.metaLine.textContent = `${entry.lessonTitle} · ${CATEGORY_LABELS[entry.category] || entry.category}`;
    els.questionText.textContent = entry.prompt;
    els.questionText.classList.remove("word-prompt");
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
    els.questionText.classList.remove("chinese-prompt");
  } else {
    els.metaLine.textContent = `Ch ${entry.chapterId}: ${entry.chapterTitle} · ${entry.topicName}`;
    els.questionText.textContent = entry.question;
    els.questionText.classList.remove("word-prompt", "chinese-prompt");
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

function handleSound() {
  if (subject !== "chinese" || !current) return;
  speakChinese(current.speak || current.hanzi, current);
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
  } else {
    for (const cat of chineseData.categories) {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.label;
      els.filterSelect.appendChild(opt);
    }
    const total = chineseData.items.length;
    els.statsLine.textContent = `${total} items · ${chineseData.meta.title}`;
  }
}

function setSubject(next) {
  subject = next;
  speechSynthesis.cancel();
  updateSubjectUI();
  updateExplainLabels();
  populateFilter();
  renderQuestion(pickRandom());
}

function init() {
  els.btnMath.addEventListener("click", () => setSubject("math"));
  els.btnEnglish.addEventListener("click", () => setSubject("english"));
  els.btnChinese.addEventListener("click", () => setSubject("chinese"));
  els.btnAnswer.addEventListener("click", handleAnswer);
  els.btnSound.addEventListener("click", handleSound);
  els.filterSelect.addEventListener("change", () => renderQuestion(pickRandom()));
  initChineseVoice();
}

async function load() {
  try {
    const [mathRes, vocabRes, chineseRes] = await Promise.all([
      fetch("flashcards.json"),
      fetch("vocabulary.json"),
      fetch("chinese-lesson1.json"),
    ]);
    if (!mathRes.ok || !vocabRes.ok || !chineseRes.ok) throw new Error("Failed to load data");
    mathData = await mathRes.json();
    vocabData = await vocabRes.json();
    chineseData = await chineseRes.json();
    init();
    setSubject("math");
  } catch (err) {
    els.questionText.textContent = "Could not load. Run a local server in prealgebra-practice/.";
    console.error(err);
  }
}

load();
