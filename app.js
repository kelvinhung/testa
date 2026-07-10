/** Math + English flashcard practice */

let mathData = null;
let vocabData = null;
let subject = "math"; // "math" | "english"
/** @type {object|null} */
let current = null;

const $ = (id) => document.getElementById(id);

const els = {
  btnMath: $("btnMath"),
  btnEnglish: $("btnEnglish"),
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
  btnRandom: $("btnRandom"),
  btnExplain: $("btnExplain"),
  btnAnswer: $("btnAnswer"),
  btnSimilar: $("btnSimilar"),
  statsLine: $("statsLine"),
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

function getPool() {
  return subject === "math"
    ? buildMathPool(els.filterSelect.value)
    : buildEnglishPool(els.filterSelect.value);
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
    } else {
      const same =
        candidate.gradeId === exclude.gradeId &&
        candidate.wordIndex === exclude.wordIndex;
      if (!same) break;
    }
  } while (attempts < 40);

  return candidate;
}

function pickSimilar() {
  if (!current) return pickRandom();

  if (subject === "math") {
    const siblings = current.topicQuestions
      .map((q, qi) => ({ ...q, questionIndex: qi }))
      .filter((q) => q.questionIndex !== current.questionIndex);
    if (!siblings.length) return pickRandom(current);
    const pick = siblings[Math.floor(Math.random() * siblings.length)];
    return {
      ...current,
      question: pick.text,
      answer: pick.answer || "(see ebook)",
      questionIndex: pick.questionIndex,
    };
  }

  const siblings = current.gradeWords
    .map((w, wi) => ({ ...w, wordIndex: wi }))
    .filter((w) => w.wordIndex !== current.wordIndex);
  if (!siblings.length) return pickRandom(current);
  const pick = siblings[Math.floor(Math.random() * siblings.length)];
  return {
    ...current,
    word: pick.word,
    definition: pick.definition,
    examples: pick.examples,
    question: `What does "${pick.word}" mean?`,
    answer: pick.definition,
    keyIdea: pick.definition,
    example: pick.examples.join(" "),
    wordIndex: pick.wordIndex,
  };
}

function hidePanels() {
  els.explainPanel.classList.add("hidden");
  els.answerPanel.classList.add("hidden");
  els.btnExplain.classList.remove("active");
  els.btnAnswer.classList.remove("active");
  els.btnExplain.querySelector(".btn-short").textContent = "Explain";
  els.btnAnswer.querySelector(".btn-short").textContent = "Answer";
}

function updateExplainLabels() {
  if (subject === "english") {
    els.explainLabel1.textContent = "Definition";
    els.explainLabel2.textContent = "Example sentences";
    els.answerLabel.textContent = "Definition";
  } else {
    els.explainLabel1.textContent = "Key idea";
    els.explainLabel2.textContent = "Example";
    els.answerLabel.textContent = "Answer";
  }
}

function renderQuestion(entry) {
  if (!entry) {
    els.metaLine.textContent = "No items";
    els.questionText.textContent = "Try another filter.";
    els.questionText.classList.remove("word-prompt");
    return;
  }

  current = entry;
  hidePanels();

  if (subject === "english") {
    els.metaLine.textContent = `${entry.gradeTitle} · Vocabulary`;
    els.questionText.textContent = entry.word;
    els.questionText.classList.add("word-prompt");
  } else {
    els.metaLine.textContent = `Ch ${entry.chapterId}: ${entry.chapterTitle} · ${entry.topicName}`;
    els.questionText.textContent = entry.question;
    els.questionText.classList.remove("word-prompt");
  }
}

function toggleExplain() {
  if (!current) return;

  const showing = !els.explainPanel.classList.contains("hidden");
  if (showing) {
    els.explainPanel.classList.add("hidden");
    els.btnExplain.classList.remove("active");
    els.btnExplain.querySelector(".btn-short").textContent = "Explain";
  } else {
    els.keyIdea.textContent = current.keyIdea || "—";
    if (subject === "english" && current.examples?.length) {
      els.exampleText.innerHTML = current.examples.map((s) => `• ${s}`).join("<br>");
    } else {
      els.exampleText.textContent = current.example || "—";
    }
    els.explainPanel.classList.remove("hidden");
    els.btnExplain.classList.add("active");
    els.btnExplain.querySelector(".btn-short").textContent = "Hide";
  }
}

function toggleAnswer() {
  if (!current) return;

  const showing = !els.answerPanel.classList.contains("hidden");
  if (showing) {
    els.answerPanel.classList.add("hidden");
    els.btnAnswer.classList.remove("active");
    els.btnAnswer.querySelector(".btn-short").textContent = "Answer";
  } else {
    els.answerText.textContent = current.answer || "—";
    els.answerPanel.classList.remove("hidden");
    els.btnAnswer.classList.add("active");
    els.btnAnswer.querySelector(".btn-short").textContent = "Hide";
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
  } else {
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
  }
}

function setSubject(next) {
  subject = next;
  document.body.classList.toggle("english-mode", subject === "english");
  els.btnMath.classList.toggle("active", subject === "math");
  els.btnEnglish.classList.toggle("active", subject === "english");
  els.btnMath.setAttribute("aria-selected", subject === "math");
  els.btnEnglish.setAttribute("aria-selected", subject === "english");
  updateExplainLabels();
  populateFilter();
  renderQuestion(pickRandom());
}

function init() {
  els.btnMath.addEventListener("click", () => setSubject("math"));
  els.btnEnglish.addEventListener("click", () => setSubject("english"));
  els.btnRandom.addEventListener("click", () => renderQuestion(pickRandom(current)));
  els.btnSimilar.addEventListener("click", () => renderQuestion(pickSimilar()));
  els.btnExplain.addEventListener("click", toggleExplain);
  els.btnAnswer.addEventListener("click", toggleAnswer);
  els.filterSelect.addEventListener("change", () => renderQuestion(pickRandom()));
}

async function load() {
  try {
    const [mathRes, vocabRes] = await Promise.all([
      fetch("flashcards.json"),
      fetch("vocabulary.json"),
    ]);
    if (!mathRes.ok || !vocabRes.ok) throw new Error("Failed to load data");
    mathData = await mathRes.json();
    vocabData = await vocabRes.json();
    init();
    setSubject("math");
  } catch (err) {
    els.questionText.textContent = "Could not load. Run a local server in prealgebra-practice/.";
    console.error(err);
  }
}

load();
