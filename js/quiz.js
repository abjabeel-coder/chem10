// ─── QUIZ ENGINE ───────────────────────────────────────────────

const Quiz = (() => {
  // ── State ──
  let _questions   = [];   // full MCQ dataset
  let _session     = null; // active test session
  let _timerInterval = null;

  // ── Load MCQ data ──
  async function loadData() {
    if (_questions.length) return _questions;
    const res = await fetch('data/mcqs.json');
    _questions = await res.json();
    return _questions;
  }

  // ── Utility: Fisher-Yates shuffle ──
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Build a session ──
  // chapters: array of chapter numbers ([] = all)
  // count: number of questions
  // timeLimitMin: 0 = unlimited
  function buildSession(chapters, count, timeLimitMin) {
    let pool = chapters.length
      ? _questions.filter(q => chapters.includes(q.chapter))
      : [..._questions];

    pool = shuffle(pool).slice(0, Math.min(count, pool.length));

    // For each question, pre-shuffle the option keys
    const items = pool.map(q => {
      const keys = shuffle(Object.keys(q.options)); // e.g. ['C','A','D','B']
      return { q, keys, userAnswer: null, shuffledCorrect: null };
    });

    _session = {
      items,
      current: 0,
      correct: 0,
      wrong: 0,
      startTime: Date.now(),
      timeLimitMs: timeLimitMin > 0 ? timeLimitMin * 60 * 1000 : 0,
      finished: false,
      chapters,
    };
    return _session;
  }

  function getSession()   { return _session; }
  function getQuestions() { return _questions; }

  // ── Timer ──
  function startTimer(onTick, onExpire) {
    if (_timerInterval) clearInterval(_timerInterval);
    if (!_session || _session.timeLimitMs === 0) return;

    _timerInterval = setInterval(() => {
      const elapsed = Date.now() - _session.startTime;
      const remaining = _session.timeLimitMs - elapsed;
      if (remaining <= 0) {
        clearInterval(_timerInterval);
        _timerInterval = null;
        onExpire();
      } else {
        onTick(remaining);
      }
    }, 500);
  }

  function stopTimer() {
    if (_timerInterval) clearInterval(_timerInterval);
    _timerInterval = null;
  }

  // ── Record answer for current question ──
  // Returns { correct: bool, correctKey: 'A'|..., explanation: str }
  function answer(key) {
    const item = _session.items[_session.current];
    if (item.userAnswer !== null) return null; // already answered

    const correctKey = item.q.verified_answer;
    const isCorrect  = key === correctKey;

    item.userAnswer = key;
    item.shuffledCorrect = correctKey;

    if (isCorrect) _session.correct++;
    else           _session.wrong++;

    // Build explanation
    const note = (item.q.verification_note || '').trim();
    const correctOptionText = item.q.options[correctKey]?.en || '';
    let explanation;
    if (note) {
      explanation = note;
    } else {
      explanation = `The correct answer is <strong>${correctKey}: ${correctOptionText}</strong>.`;
      if (!isCorrect) {
        const chosenText = item.q.options[key]?.en || '';
        explanation += ` You selected ${key}: ${chosenText}.`;
      }
    }

    return { correct: isCorrect, correctKey, explanation };
  }

  // ── Advance to next question ──
  function next() {
    if (!_session) return false;
    if (_session.current < _session.items.length - 1) {
      _session.current++;
      return true;
    }
    _session.finished = true;
    stopTimer();
    return false;
  }

  // ── Force finish (timeout) ──
  function finish() {
    if (_session) {
      _session.finished = true;
      stopTimer();
    }
  }

  // ── Build result summary ──
  function getResult() {
    if (!_session) return null;
    const timeTaken = Math.round((Date.now() - _session.startTime) / 1000);
    const total     = _session.items.length;
    const correct   = _session.correct;
    const wrong     = _session.wrong;
    const skipped   = total - correct - wrong;
    const pct       = Math.round((correct / total) * 100);

    return {
      total, correct, wrong, skipped, pct, timeTaken,
      items: _session.items,
      chapters: _session.chapters,
      score: `${correct}/${total}`,
    };
  }

  // ── Format seconds as mm:ss ──
  function formatMs(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function formatSec(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return { loadData, buildSession, getSession, getQuestions, startTimer, stopTimer, answer, next, finish, getResult, formatMs, formatSec, shuffle };
})();
