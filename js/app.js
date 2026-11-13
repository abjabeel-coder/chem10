// ── Theme toggle ──
(function() {
  const saved = localStorage.getItem('chem10-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggle');
    function applyTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      btn.textContent = t === 'dark' ? '🌙' : '☀️';
      btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      localStorage.setItem('chem10-theme', t);
    }
    applyTheme(saved);
    btn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    };
  });
})();

// ─── APP ───────────────────────────────────────────────────────
// Screen router + all UI rendering/event wiring

const CHAPTER_NAMES = {
  14: 'States of Matter',
  15: 'Moles and Stoichiometry',
  16: 'Electrochemistry',
  17: 'Chemical Kinetics',
  18: 'Chemistry of Salts',
  19: 'Industrial Chemistry',
  20: 'Water',
  21: 'Organic Chemistry',
  22: 'Alkenes & Alkynes',
  23: 'Alcohol & Fermentation',
  24: 'Carboxylic Acids',
  25: 'Biochemistry',
  26: 'Polymers & Plastics',
};

// ── State for setup screen ──
let _setupChapters  = [];   // selected chapter numbers
let _setupQty       = 10;
let _setupTimeMins  = 10;
let _lastSetup      = null; // remember for Retry

// ── Helpers ──
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  await Quiz.loadData();
  buildHomeChapterGrid();
  buildSetupChapterGrid();
  wireSetup();
  wireQuiz();
  wireResults();

  document.getElementById('startPracticeBtn').onclick = () => show('screenSetup');
});

// ════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════
function buildHomeChapterGrid() {
  const qs = Quiz.getQuestions();
  const counts = {};
  qs.forEach(q => { counts[q.chapter] = (counts[q.chapter] || 0) + 1; });

  const grid = document.getElementById('homeChapterGrid');
  grid.innerHTML = '';
  Object.entries(CHAPTER_NAMES).forEach(([ch, name]) => {
    const n = parseInt(ch);
    const c = counts[n] || 0;
    const card = document.createElement('div');
    card.className = 'chapter-card';
    card.innerHTML = `
      <div class="chapter-num">Chapter ${n}</div>
      <div class="chapter-name">${name}</div>
      <div class="chapter-count">${c} MCQ${c !== 1 ? 's' : ''}</div>`;
    card.onclick = () => {
      show('screenSetup');
      // Pre-select this chapter
      _setupChapters = [n];
      renderChapterChecks();
      updateQtyHint();
    };
    grid.appendChild(card);
  });
}

// ════════════════════════════════════════════
// SETUP
// ════════════════════════════════════════════
function buildSetupChapterGrid() {
  const qs = Quiz.getQuestions();
  const counts = {};
  qs.forEach(q => { counts[q.chapter] = (counts[q.chapter] || 0) + 1; });

  const grid = document.getElementById('chapterCheckGrid');
  grid.innerHTML = '';
  Object.entries(CHAPTER_NAMES).forEach(([ch, name]) => {
    const n = parseInt(ch);
    const c = counts[n] || 0;
    const label = document.createElement('label');
    label.className = 'chapter-check';
    label.dataset.ch = n;
    label.innerHTML = `
      <input type="checkbox" value="${n}" />
      <span class="check-box">✓</span>
      <span>
        <span class="check-label">Ch ${n} · ${name}</span><br>
        <span class="check-count">${c} Qs</span>
      </span>`;
    label.onclick = (e) => {
      e.preventDefault();
      if (_setupChapters.includes(n)) {
        _setupChapters = _setupChapters.filter(x => x !== n);
      } else {
        _setupChapters.push(n);
      }
      renderChapterChecks();
      updateQtyHint();
    };
    grid.appendChild(label);
  });
}

function renderChapterChecks() {
  document.querySelectorAll('#chapterCheckGrid .chapter-check').forEach(el => {
    const ch = parseInt(el.dataset.ch);
    if (_setupChapters.includes(ch)) el.classList.add('selected');
    else el.classList.remove('selected');
  });
}

function poolSize() {
  const qs = Quiz.getQuestions();
  if (!_setupChapters.length) return qs.length;
  return qs.filter(q => _setupChapters.includes(q.chapter)).length;
}

function updateQtyHint() {
  const max = poolSize();
  if (_setupQty > max) _setupQty = max;
  document.getElementById('qtyVal').textContent = _setupQty;
  const chText = _setupChapters.length
    ? `${_setupChapters.length} chapter${_setupChapters.length > 1 ? 's' : ''} selected (${max} available)`
    : `all chapters (${max} available)`;
  document.getElementById('qtyHint').textContent = `${_setupQty} question${_setupQty !== 1 ? 's' : ''} from ${chText}`;
}

function wireSetup() {
  document.getElementById('backToHome').onclick = () => show('screenHome');

  document.getElementById('selectAll').onclick = () => {
    _setupChapters = Object.keys(CHAPTER_NAMES).map(Number);
    renderChapterChecks();
    updateQtyHint();
  };
  document.getElementById('clearAll').onclick = () => {
    _setupChapters = [];
    renderChapterChecks();
    updateQtyHint();
  };

  document.getElementById('qtyMinus').onclick = () => {
    if (_setupQty > 1) { _setupQty--; updateQtyHint(); }
  };
  document.getElementById('qtyPlus').onclick = () => {
    if (_setupQty < poolSize()) { _setupQty++; updateQtyHint(); }
  };

  document.querySelectorAll('.time-chip').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.time-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _setupTimeMins = parseInt(btn.dataset.min);
    };
  });

  document.getElementById('beginTestBtn').onclick = () => {
    const pool = poolSize();
    if (pool === 0) {
      alert('No questions found for the selected chapters.');
      return;
    }
    _lastSetup = { chapters: [..._setupChapters], qty: _setupQty, time: _setupTimeMins };
    startTest(_setupChapters, _setupQty, _setupTimeMins);
  };
}

// ════════════════════════════════════════════
// QUIZ
// ════════════════════════════════════════════
function startTest(chapters, qty, timeMins) {
  Quiz.buildSession(chapters, qty, timeMins);
  show('screenQuiz');
  renderQuestion();

  if (timeMins > 0) {
    Quiz.startTimer(
      (remaining) => updateTimer(remaining),
      () => {
        Quiz.finish();
        document.getElementById('timeoutModal').style.display = 'flex';
      }
    );
    document.getElementById('timerWrap').style.display = 'flex';
  } else {
    document.getElementById('timerWrap').style.display = 'none';
  }
}

function updateTimer(remainingMs) {
  const display = document.getElementById('timerDisplay');
  const wrap    = document.getElementById('timerWrap');
  display.textContent = Quiz.formatMs(remainingMs);
  const secs = remainingMs / 1000;
  wrap.classList.remove('warning', 'danger');
  if (secs <= 30)      wrap.classList.add('danger');
  else if (secs <= 60) wrap.classList.add('warning');
}

function renderQuestion() {
  const session = Quiz.getSession();
  const idx     = session.current;
  const total   = session.items.length;
  const item    = session.items[idx];
  const q       = item.q;

  // Header
  document.getElementById('qProgress').textContent = `Q ${idx + 1} of ${total}`;
  document.getElementById('progressFill').style.width = `${(idx / total) * 100}%`;
  document.getElementById('quizScorePill').textContent =
    `${session.correct} / ${idx}`;

  // Meta
  document.getElementById('questionMeta').textContent =
    `Chapter ${q.chapter} · ${CHAPTER_NAMES[q.chapter]} · ${q.source_type}`;

  // Question text
  document.getElementById('questionText').textContent = q.question_en;

  // Question image (if any)
  const qImgEl = document.getElementById('questionImage');
  qImgEl.innerHTML = '';
  if (q.question_images && q.question_images.length) {
    q.question_images.forEach(fname => {
      const img = document.createElement('img');
      img.src = `images/svg/${fname}`;
      img.alt = 'Question diagram';
      img.style.maxWidth = '100%';
      qImgEl.appendChild(img);
    });
  }

  // Options (shuffled order already in item.keys)
  const optList = document.getElementById('optionsList');
  optList.innerHTML = '';
  item.keys.forEach((key, i) => {
    const opt = q.options[key];
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.key = key;

    const displayLabel = String.fromCharCode(65 + i); // A B C D display label
    btn.innerHTML = `<span class="option-label">${displayLabel}</span>`;

    // Option may have text or image
    if (opt.en) {
      const textSpan = document.createElement('span');
      textSpan.textContent = opt.en;
      btn.appendChild(textSpan);
    }
    if (opt.image) {
      const img = document.createElement('img');
      img.src = `images/svg/${opt.image}`;
      img.className = 'option-image';
      img.alt = `Option ${key}`;
      btn.appendChild(img);
    }

    btn.onclick = () => handleAnswer(key);
    optList.appendChild(btn);
  });

  // Hide explanation
  document.getElementById('explanationPanel').style.display = 'none';
}

function handleAnswer(key) {
  const result = Quiz.answer(key);
  if (!result) return;

  // Disable all buttons and colour them
  const session = Quiz.getSession();
  const item    = session.items[session.current];
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    const bKey = btn.dataset.key;
    if (bKey === result.correctKey) btn.classList.add('correct');
    else if (bKey === key && !result.correct) btn.classList.add('wrong');
  });

  // Update score pill immediately
  document.getElementById('quizScorePill').textContent =
    `${session.correct} / ${session.current + 1}`;

  // Show explanation
  const panel   = document.getElementById('explanationPanel');
  const badge   = document.getElementById('expBadge');
  const expText = document.getElementById('expText');

  badge.textContent  = result.correct ? '✓ Correct' : '✗ Wrong';
  badge.className    = `exp-badge ${result.correct ? 'correct' : 'wrong'}`;
  expText.innerHTML  = result.explanation;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // If last question, change button label
  const isLast = session.current === session.items.length - 1;
  document.getElementById('nextBtn').textContent = isLast ? 'View Results →' : 'Next Question →';
}

function wireQuiz() {
  document.getElementById('nextBtn').onclick = () => {
    const hasMore = Quiz.next();
    if (hasMore) {
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showResults();
    }
  };

  document.getElementById('timeoutResultBtn').onclick = () => {
    document.getElementById('timeoutModal').style.display = 'none';
    showResults();
  };
}

// ════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════
function showResults() {
  Quiz.stopTimer();
  const r = Quiz.getResult();

  // Save to Supabase if logged in
  Auth.saveResult(r);

  // Score display
  const pct = r.pct;
  let emoji, label;
  if (pct === 100)       { emoji = '🏆'; label = 'Perfect score!'; }
  else if (pct >= 80)    { emoji = '🎉'; label = 'Excellent work!'; }
  else if (pct >= 60)    { emoji = '👍'; label = 'Good effort!'; }
  else if (pct >= 40)    { emoji = '📖'; label = 'Keep practising.'; }
  else                   { emoji = '💪'; label = 'Review the chapters and try again.'; }

  document.getElementById('resultEmoji').textContent    = emoji;
  document.getElementById('resultScoreBig').textContent = `${pct}%`;
  document.getElementById('resultLabel').textContent    = label;
  document.getElementById('resultScoreBig').style.color =
    pct >= 60 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';

  document.getElementById('rsCorrect').textContent = r.correct;
  document.getElementById('rsWrong').textContent   = r.wrong;
  document.getElementById('rsTime').textContent    = Quiz.formatSec(r.timeTaken);

  // Review list
  const reviewEl = document.getElementById('resultReview');
  reviewEl.innerHTML = `<div class="review-title">Question Review</div>`;
  r.items.forEach((item, i) => {
    const q         = item.q;
    const answered  = item.userAnswer !== null;
    const isCorrect = answered && item.userAnswer === item.shuffledCorrect;
    const div       = document.createElement('div');
    div.className   = `review-item ${isCorrect ? 'correct' : 'wrong'}`;

    const correctText = q.options[q.verified_answer]?.en || q.verified_answer;
    const userText    = answered ? (q.options[item.userAnswer]?.en || item.userAnswer) : '—';
    const note        = (q.verification_note || '').trim();

    div.innerHTML = `
      <div class="review-q">${i + 1}. ${q.question_en}</div>
      <div class="review-answer">
        Your answer: <span class="${isCorrect ? 'hl-green' : 'hl-red'}">${answered ? item.userAnswer + ': ' + userText : 'Not answered'}</span>
        ${!isCorrect ? ` &nbsp;·&nbsp; Correct: <span class="hl-green">${q.verified_answer}: ${correctText}</span>` : ''}
      </div>
      ${note ? `<div class="review-exp">💡 ${note}</div>` : ''}`;

    reviewEl.appendChild(div);
  });

  show('screenResults');
}

function wireResults() {
  document.getElementById('retryBtn').onclick = () => {
    if (_lastSetup) {
      startTest(_lastSetup.chapters, _lastSetup.qty, _lastSetup.time);
    }
  };
  document.getElementById('newTestBtn').onclick = () => {
    show('screenSetup');
  };
}

// ════════════════════════════════════════════
// TEACHER DASHBOARD
// ════════════════════════════════════════════

const CHAPTER_NAMES_LIST = {
  14:'States of Matter', 15:'Moles & Stoichiometry', 16:'Electrochemistry',
  17:'Chemical Kinetics', 18:'Chemistry of Salts', 19:'Industrial Chemistry',
  20:'Water', 21:'Organic Chemistry', 22:'Alkenes & Alkynes',
  23:'Alcohol & Fermentation', 24:'Carboxylic Acids', 25:'Biochemistry',
  26:'Polymers & Plastics'
};

function isTeacher(user) {
  return user && user.email && user.email.toLowerCase() === TEACHER_EMAIL.toLowerCase();
}

function showTeacherBtn(user) {
  const btn = document.getElementById('teacherDashBtn');
  if (isTeacher(user)) {
    btn.classList.remove('hidden');
    btn.onclick = () => openTeacherDash();
  } else {
    btn.classList.add('hidden');
  }
}

async function openTeacherDash() {
  show('screenTeacher');
  document.getElementById('dashContent').innerHTML =
    `<div class="dash-loading"><div class="spin">⚗️</div><div>Loading student data…</div></div>`;

  const sb = Auth.getSupabase();
  if (!sb) {
    renderDash(generateDemoData()); return;
  }
  try {
    const { data, error } = await sb
      .from('quiz_results_with_email')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      const { data: basic, error: e2 } = await sb
        .from('quiz_results').select('*').order('created_at', { ascending: false });
      if (e2) throw e2;
      renderDash(basic.map(r => ({ ...r, email: r.user_id.slice(0,8)+'…' })));
    } else { renderDash(data); }
  } catch (e) {
    document.getElementById('dashContent').innerHTML =
      `<div class="dash-empty">⚠️ Could not load data.<br><small>${e.message}</small></div>`;
  }
}

function generateDemoData() {
  const names=['Ali Hassan','Sara Ahmed','Bilal Khan','Ayesha Malik','Usman Raza',
               'Hira Noor','Zain Butt','Maria Sheikh','Faisal Qureshi','Sana Tariq'];
  const results=[];
  names.forEach((name,i)=>{
    const attempts=Math.floor(Math.random()*4)+1;
    for(let a=0;a<attempts;a++){
      const total=[5,10,15,20][Math.floor(Math.random()*4)];
      const correct=Math.floor(Math.random()*(total+1));
      const chStart=14+Math.floor(Math.random()*8);
      const chCount=Math.floor(Math.random()*3)+1;
      const chapters=Array.from({length:chCount},(_,k)=>chStart+k).filter(c=>c<=26);
      const d=new Date(); d.setDate(d.getDate()-Math.floor(Math.random()*14));
      results.push({ user_id:`user_${i}`,
        email:name.toLowerCase().replace(' ','.')+`${i}@student.com`,
        score:`${correct}/${total}`, total, correct, wrong:total-correct,
        time_taken:60+Math.floor(Math.random()*500), chapters, created_at:d.toISOString()
      });
    }
  });
  return results;
}

function renderDash(results) {
  if (!results || !results.length) {
    document.getElementById('dashContent').innerHTML =
      `<div class="dash-empty">📭 No quiz attempts yet.</div>`; return;
  }
  const studentMap={};
  results.forEach(r=>{
    const key=r.email||r.user_id;
    if(!studentMap[key]) studentMap[key]={email:key,attempts:0,totalCorrect:0,totalQs:0,chapterWrong:{},lastDate:''};
    const s=studentMap[key];
    s.attempts++; s.totalCorrect+=(r.correct||0); s.totalQs+=(r.total||0);
    (r.chapters||[]).forEach(ch=>{
      if(!s.chapterWrong[ch]) s.chapterWrong[ch]={wrong:0,total:0};
      const n=(r.chapters||[]).length||1;
      s.chapterWrong[ch].wrong+=(r.wrong||0)/n;
      s.chapterWrong[ch].total+=(r.total||0)/n;
    });
    if(r.created_at>s.lastDate) s.lastDate=r.created_at;
  });
  const students=Object.values(studentMap);
  const avgScore=students.length
    ? Math.round(students.reduce((a,s)=>a+(s.totalQs?s.totalCorrect/s.totalQs*100:0),0)/students.length) : 0;
  const chapterAgg={};
  results.forEach(r=>{
    (r.chapters||[]).forEach(ch=>{
      if(!chapterAgg[ch]) chapterAgg[ch]={wrong:0,total:0};
      const n=(r.chapters||[]).length||1;
      chapterAgg[ch].wrong+=(r.wrong||0)/n; chapterAgg[ch].total+=(r.total||0)/n;
    });
  });
  const chapterWeakness=Object.entries(chapterAgg)
    .map(([ch,d])=>({ch:parseInt(ch),name:CHAPTER_NAMES_LIST[ch]||`Ch ${ch}`,
      wrongPct:d.total>0?Math.round((d.wrong/d.total)*100):0}))
    .sort((a,b)=>b.wrongPct-a.wrongPct);

  let html=`
  <div class="dash-stats">
    <div class="dash-stat"><div class="dash-stat-num">${students.length}</div><div class="dash-stat-lbl">Students</div></div>
    <div class="dash-stat"><div class="dash-stat-num">${results.length}</div><div class="dash-stat-lbl">Total Attempts</div></div>
    <div class="dash-stat"><div class="dash-stat-num">${avgScore}%</div><div class="dash-stat-lbl">Avg Score</div></div>
    <div class="dash-stat"><div class="dash-stat-num">${chapterWeakness[0]?'Ch '+chapterWeakness[0].ch:'—'}</div><div class="dash-stat-lbl">Weakest Chapter</div></div>
  </div>
  <div class="dash-section-title">📉 Chapter Weakness (% wrong across all attempts)</div>
  <div class="weakness-list">`;
  chapterWeakness.forEach(c=>{
    const color=c.wrongPct>=60?'var(--red)':c.wrongPct>=40?'var(--yellow)':'var(--green)';
    html+=`<div class="weakness-row">
      <div class="weakness-top">
        <span class="weakness-name">Ch ${c.ch} · ${c.name}</span>
        <span class="weakness-pct" style="color:${color}">${c.wrongPct}% wrong</span>
      </div>
      <div class="weakness-bar-bg"><div class="weakness-bar-fill" style="width:${c.wrongPct}%;background:${color}"></div></div>
    </div>`;
  });
  html+=`</div><div class="dash-section-title">👨‍🎓 Student Results</div>
  <div class="student-table-wrap"><table class="student-table">
  <thead><tr><th>Student</th><th>Attempts</th><th>Avg Score</th><th>Correct / Total</th><th>Chapters</th><th>Last Active</th></tr></thead><tbody>`;
  students.sort((a,b)=>(b.totalQs?b.totalCorrect/b.totalQs:0)-(a.totalQs?a.totalCorrect/a.totalQs:0))
    .forEach(s=>{
      const pct=s.totalQs?Math.round(s.totalCorrect/s.totalQs*100):0;
      const cls=pct>=60?'high':pct>=40?'mid':'low';
      const date=s.lastDate?new Date(s.lastDate).toLocaleDateString('en-PK',{day:'numeric',month:'short'}):'—';
      const tags=Object.keys(s.chapterWrong).map(ch=>`<span class="chapter-tag">Ch ${ch}</span>`).join('');
      html+=`<tr>
        <td>${s.email}</td><td>${s.attempts}</td>
        <td><span class="score-pill ${cls}">${pct}%</span></td>
        <td>${s.totalCorrect} / ${s.totalQs}</td>
        <td><div class="chapter-tags">${tags||'—'}</div></td>
        <td>${date}</td></tr>`;
    });
  html+=`</tbody></table></div>`;
  document.getElementById('dashContent').innerHTML=html;
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('backFromDash').onclick=()=>show('screenHome');
});

setInterval(()=>{ showTeacherBtn(Auth.getUser()); }, 500);
