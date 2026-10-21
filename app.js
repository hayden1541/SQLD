'use strict';
// ───────── 데이터 ─────────
const BANK = window.BANK, CONCEPTS = window.CONCEPTS, FLASH = window.FLASH;
const QMAP = {}; BANK.forEach(q => { QMAP[q.id] = q; });
// 문항별 보강: 핵심개념(kk) · 꿀팁(tip) · 보기별 오답 이유(w)
Object.entries(window.PLUS || {}).forEach(([id, p]) => { const q = QMAP[id]; if (!q) return; if (p.w && p.w.length === 4) q.w = p.w; if (p.k) q.kk = p.k; if (p.t) q.tip = p.t; });
const CMAP = {}; CONCEPTS.forEach(c => { CMAP[c.id] = c; });
const BY_C = {}; BANK.forEach(q => { (BY_C[q.c] = BY_C[q.c] || []).push(q.id); });
const DLABEL = ['', '초급', '중급', '고급', '실전'];
const GRP = q => q.src.startsWith('핵심기출') ? 'k' : q.src === '실전형' ? 'x' : q.src === '노랭이 스타일' ? 'y' : q.src.startsWith('기출변형') ? 'g' : 'b';
const GLABEL = { a: '전체', b: '기본', g: '기출변형', x: '실전형', y: '노랭이', k: '핵심기출' };
const ROUNDS = [...new Set(BANK.filter(q => q.src.startsWith('기출변형')).map(q => +q.src.match(/(\d+)회/)[1]))].sort((a, b) => a - b);
const MK = ['①', '②', '③', '④'];
const EMP_ROWS = [
  [7369,'SMITH','CLERK',7902,'1980-12-17',800,null,20],[7499,'ALLEN','SALESMAN',7698,'1981-02-20',1600,300,30],
  [7521,'WARD','SALESMAN',7698,'1981-02-22',1250,500,30],[7566,'JONES','MANAGER',7839,'1981-04-02',2975,null,20],
  [7654,'MARTIN','SALESMAN',7698,'1981-09-28',1250,1400,30],[7698,'BLAKE','MANAGER',7839,'1981-05-01',2850,null,30],
  [7782,'CLARK','MANAGER',7839,'1981-06-09',2450,null,10],[7788,'SCOTT','ANALYST',7566,'1987-04-19',3000,null,20],
  [7839,'KING','PRESIDENT',null,'1981-11-17',5000,null,10],[7844,'TURNER','SALESMAN',7698,'1981-09-08',1500,0,30],
  [7876,'ADAMS','CLERK',7788,'1987-05-23',1100,null,20],[7900,'JAMES','CLERK',7698,'1981-12-03',950,null,30],
  [7902,'FORD','ANALYST',7566,'1981-12-03',3000,null,20],[7934,'MILLER','CLERK',7782,'1982-01-23',1300,null,10]];
const DEPT_ROWS = [[10,'ACCOUNTING','NEW YORK'],[20,'RESEARCH','DALLAS'],[30,'SALES','CHICAGO'],[40,'OPERATIONS','BOSTON']];

// ───────── 저장 ─────────
const KEY = 'sqld_note_v1';
function blank() { return { v: 1, att: {}, days: {}, conf: {}, cdone: {}, mocks: [], fl: {}, resume: {}, set: { goal: 30, exam: '2026-11-14' } }; }
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S && window.__NATIVE_STATE) S = window.__NATIVE_STATE;
if (!S) S = blank();
S = Object.assign(blank(), S); S.set = Object.assign(blank().set, S.set);
const NATIVE = window.webkit && window.webkit.messageHandlers;
let CLOUD = null, cloudTimer = null;
function save() {
  S.at = Date.now();
  const t = JSON.stringify(S);
  try { localStorage.setItem(KEY, t); } catch (e) {}
  try { if (NATIVE && NATIVE.save) NATIVE.save.postMessage(t); } catch (e) {}
  if (CLOUD) { clearTimeout(cloudTimer); cloudTimer = setTimeout(() => { CLOUD.set({ json: JSON.stringify(S), at: S.at }).catch(() => {}); }, 1500); }
}
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// 오답 복습: 틀리면 다음 날 → 맞히면 3일 뒤 → 맞히면 7일 뒤 → 맞히면 졸업. 복습일 전에 맞힌 건 단계에 안 들어감
const RV_GAP = [1, 3, 7];
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const md2 = s => +s.slice(5, 7) + '/' + +s.slice(8, 10);
function rvDue(a) { return a.due || a.last || today(); } // 예전 기록(복습일 없음)은 바로 복습 대상
function markWrong(a) { a.st = 0; a.w = true; a.wr++; a.lv = 0; a.due = addDays(RV_GAP[0]); }
function dueIds() { const t = today(); return BANK.filter(q => { const a = S.att[q.id]; return a && a.w && rvDue(a) <= t; }).map(q => q.id); }
function nextDue() { let m = null; BANK.forEach(q => { const a = S.att[q.id]; if (a && a.w) { const d = rvDue(a); if (!m || d < m) m = d; } }); return m; }
function rvTag(a) { if (!a.w) return ''; const d = rvDue(a); return `복습 ${a.lv || 0}/3 · ${d <= today() ? '<b style="color:var(--pri)">오늘</b>' : md2(d)}`; }
function record(qid, ok) {
  const a = S.att[qid] || (S.att[qid] = { n: 0, c: 0, st: 0, w: false, wr: 0 });
  const due0 = rvDue(a); let msg = '';
  a.n++; a.last = today();
  if (ok) {
    a.c++; a.st++;
    if (a.w) {
      if (due0 <= today()) {
        a.lv = (a.lv || 0) + 1;
        if (a.lv >= RV_GAP.length) { a.w = false; delete a.lv; delete a.due; msg = '복습 3/3 통과 · 오답노트에서 졸업했어요'; }
        else { a.due = addDays(RV_GAP[a.lv]); msg = `복습 ${a.lv}/3 통과 · ${RV_GAP[a.lv]}일 뒤(${md2(a.due)})에 다시 나와요`; }
      } else msg = `복습일 전이라 단계는 그대로예요 · 다음 복습 ${md2(a.due)}`;
    }
  } else { const again = a.w || a.wr > 0; markWrong(a); msg = (again ? '복습 처음부터 · ' : '오답노트에 추가 · ') + '내일 다시 나와요'; }
  const d = S.days[today()] || (S.days[today()] = { n: 0, c: 0 });
  d.n++; if (ok) d.c++;
  save();
  return msg;
}

// ───────── 통계 ─────────
function conceptStat(cid) {
  let n = 0, c = 0, solved = 0;
  (BY_C[cid] || []).forEach(id => { const a = S.att[id]; if (a) { n += a.n; c += a.c; solved++; } });
  return { n, c, solved, total: (BY_C[cid] || []).length, acc: n ? c / n : null };
}
function overall(filter) {
  let n = 0, c = 0, solved = 0, total = 0;
  BANK.forEach(q => { if (filter && !filter(q)) return; total++; const a = S.att[q.id]; if (a) { n += a.n; c += a.c; solved++; } });
  return { n, c, solved, total, acc: n ? c / n : null };
}
// 약한 순: 보이는 정답률(c/n)이 낮은 순, 같으면 틀린 횟수가 많은 순, 그다음 푼 횟수가 많은 순
function weakCmp(a, b) { return a.s.c / a.s.n - b.s.c / b.s.n || (b.s.n - b.s.c) - (a.s.n - a.s.c) || b.s.n - a.s.n; }
function weakList() {
  return CONCEPTS.map(c => ({ c, s: conceptStat(c.id) }))
    .filter(x => x.s.n >= 3)
    .sort(weakCmp);
}
function wrongIds() { return BANK.filter(q => (S.att[q.id] && S.att[q.id].w) || S.conf[q.id]).map(q => q.id); }
function streakDays() {
  let k = 0; const d = new Date();
  if (!S.days[today()]) d.setDate(d.getDate() - 1);
  for (;;) { const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (S.days[key] && S.days[key].n > 0) { k++; d.setDate(d.getDate() - 1); } else break; }
  return k;
}
function dday() { const e = new Date(S.set.exam + 'T00:00:00'); const t = new Date(today() + 'T00:00:00'); return Math.round((e - t) / 86400000); }
const pct = v => v == null ? '—' : Math.round(v * 100) + '%';
const lvl = v => v == null ? '' : v < 0.6 ? 'low' : v < 0.8 ? 'mid' : 'high';

// ───────── 유틸 ─────────
const $ = s => document.querySelector(s);
function esc(t) { return String(t).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
function md(t) { return esc(t).replace(/__([^_\s][^_]*?)__/g, '<u>$1</u>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>'); }
// ───────── 표기법 그림 (SVG) ─────────
// ie|A|끝A|끝B|B|s/d   끝 = (최소)(최대), 선에서 엔터티 쪽으로 읽음: 11 o1 1< o< -< o- 등
// end|B|끝   bk|엔터티|#속성,*속성,o속성   bkrel|A|B|A점선|B점선|B까마귀발   chen|A|관계|B|A속성,..|B속성,..
const FS = 'stroke="var(--ink)" stroke-width="1.6" fill="none"';
function figText(x, y, t, size, w) { return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${size || 13}" font-weight="${w || 600}" fill="var(--ink)" font-family="-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif">${esc(t)}</text>`; }
function figBox(x, y, w, h, t, rx) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx == null ? 5 : rx}" fill="var(--card)" ${FS}/>` + figText(x + w / 2, y + h / 2, t); }
function figEnd(edge, y, d, s) {
  // edge = 엔터티 경계 x, d = 엔터티에서 선 쪽 방향(+1/-1), s = 최소+최대
  const mn = s[0], mx = s[1]; let o = '';
  if (mx === '<') o += `<path d="M${edge + d * 15} ${y} L${edge} ${y - 9} M${edge + d * 15} ${y} L${edge} ${y} M${edge + d * 15} ${y} L${edge} ${y + 9}" ${FS}/>`;
  else if (mx === '1') o += `<path d="M${edge + d * 10} ${y - 9} V${y + 9}" ${FS}/>`;
  const mo = mx === '<' ? 25 : 20;
  if (mn === '1') o += `<path d="M${edge + d * (mx === '<' ? 21 : 17)} ${y - 9} V${y + 9}" ${FS}/>`;
  else if (mn === 'o') o += `<circle cx="${edge + d * mo}" cy="${y}" r="5.5" fill="var(--card)" ${FS}/>`;
  return o;
}
function figSVG(spec, small) {
  const p = spec.split('|'), k = p[0]; let w = 340, h = 64, b = '';
  if (k === 'ie') {
    const [, A, ea, eb, B, ln] = p, y = 32, bw = 84;
    b += `<path d="M${6 + bw} ${y} H${w - 6 - bw}" ${FS} ${ln === 'd' ? 'stroke-dasharray="6 4"' : ''}/>`;
    b += figBox(6, y - 20, bw, 40, A) + figBox(w - 6 - bw, y - 20, bw, 40, B);
    b += figEnd(6 + bw, y, 1, ea || '--') + figEnd(w - 6 - bw, y, -1, eb || '--');
  } else if (k === 'end') {
    const [, B, e] = p; w = 220; h = 44; const y = 22, bw = 72;
    b += `<path d="M4 ${y} H${w - 4 - bw}" ${FS}/>` + figBox(w - 4 - bw, y - 16, bw, 32, B) + figEnd(w - 4 - bw, y, -1, e);
  } else if (k === 'bk') {
    const [, E, at] = p, rows = at.split(','); w = 200; h = 54 + rows.length * 22;
    b += `<rect x="20" y="4" width="160" height="${h - 8}" rx="16" fill="var(--card)" ${FS}/>` + figText(100, 22, E, 14, 700);
    b += `<path d="M30 36 H170" stroke="var(--line)" stroke-width="1"/>`;
    rows.forEach((r, i) => { b += `<text x="40" y="${52 + i * 22}" dominant-baseline="central" font-size="13" fill="var(--ink)" font-family="ui-monospace,Menlo,monospace">${esc(r[0])} <tspan font-family="-apple-system,'Apple SD Gothic Neo',sans-serif">${esc(r.slice(1))}</tspan></text>`; });
  } else if (k === 'bkrel') {
    const [, A, B, da, db, cb] = p, y = 32, bw = 84, x1 = 6 + bw, x2 = w - 6 - bw, mid = (x1 + x2) / 2;
    b += `<path d="M${x1} ${y} H${mid}" ${FS} ${da === '1' ? 'stroke-dasharray="6 4"' : ''}/><path d="M${mid} ${y} H${x2}" ${FS} ${db === '1' ? 'stroke-dasharray="6 4"' : ''}/>`;
    b += figBox(6, y - 20, bw, 40, A, 14) + figBox(x2, y - 20, bw, 40, B, 14);
    if (cb === '1') b += `<path d="M${x2 - 15} ${y} L${x2} ${y - 9} M${x2 - 15} ${y} L${x2} ${y + 9}" ${FS}/>`;
  } else if (k === 'chen') {
    const [, A, R, B, aa, ba] = p; h = 128; const y = 92, bw = 70;
    const ea = (aa || '').split(',').filter(Boolean), eb = (ba || '').split(',').filter(Boolean);
    const ell = (cx, cy, t) => `<ellipse cx="${cx}" cy="${cy}" rx="34" ry="14" fill="var(--card)" ${FS}/>` + figText(cx, cy, t, 11, 500);
    const tops = (arr, cx) => arr.map((t, i) => { const ex = cx + (i - (arr.length - 1) / 2) * 72; return `<path d="M${cx} ${y - 18} L${ex} 36" ${FS}/>` + ell(ex, 26, t); }).join('');
    b += tops(ea, 6 + bw / 2) + tops(eb, w - 6 - bw / 2);
    b += `<path d="M${6 + bw} ${y} H${w - 6 - bw}" ${FS}/>`;
    b += `<path d="M${w / 2} ${y - 22} L${w / 2 + 40} ${y} L${w / 2} ${y + 22} L${w / 2 - 40} ${y} Z" fill="var(--card)" ${FS}/>` + figText(w / 2, y, R, 12);
    b += `<rect x="6" y="${y - 18}" width="${bw}" height="36" fill="var(--card)" ${FS}/>` + figText(6 + bw / 2, y, A);
    b += `<rect x="${w - 6 - bw}" y="${y - 18}" width="${bw}" height="36" fill="var(--card)" ${FS}/>` + figText(w - 6 - bw / 2, y, B);
  }
  return `<svg class="fig${small ? ' sm' : ''}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">${b}</svg>`;
}
function figs(q) { return q.fig ? `<div class="figs">${q.fig.map(s => figSVG(s)).join('')}</div>` : ''; }
function miniTbl(t, cls) { return `<table class="t ${cls || ''}">${t.cols ? '<tr>' + t.cols.map(x => `<th>${esc(x)}</th>`).join('') + '</tr>' : ''}${t.rows.map(r => '<tr>' + r.map(x => `<td>${x === 'NULL' ? '<span class="muted">NULL</span>' : md(x)}</td>`).join('') + '</tr>').join('')}</table>`; }
function ot(t) {
  if (t && typeof t === 'object') return `<div class="otb">${miniTbl(t, 'qt-tb')}</div>`;
  if (t.indexOf('\n') >= 0) return `<pre class="ocode">${md(t)}</pre>`;
  return t[0] === '§' ? figSVG(t.slice(1), true) : md(t);
}
// 핵심기출: 아래 박스 · 원본 그림 · 표 · 메모
function qExtra(q) {
  let h = '';
  if (q.box) h += `<div class="qbox"><span class="qbox-h">아래</span>${q.box.map(l => `<div class="bl">${l ? md(l) : '&nbsp;'}</div>`).join('')}</div>`;
  if (q.img) h += `<figure class="kimg"><img src="${q.img}" alt="${esc(q.imgAlt || '문제 그림')}">${q.imgAlt ? `<figcaption>${esc(q.imgAlt)}</figcaption>` : ''}</figure>`;
  const tb = (q.tables || []).filter(t => !t.after);
  if (tb.length) h += `<div class="qt">${tb.map(t => `<div class="qt-t">${t.name ? `<b>${esc(t.name)}</b>` : ''}${miniTbl(t, 'qt-tb')}</div>`).join('')}</div>`;
  if (q.note) h += `<div class="qnote">※ ${md(q.note)}</div>`;
  return h;
}
// 원본에서 SQL 뒤에 나오는 표(실행 결과 등)는 SQL 아래에
function qCode(q) {
  const tb = (q.tables || []).filter(t => t.after);
  const c = codeHTML(q['code']);
  return (q.kc && c ? `<div class="kcode">${c}</div>` : c) + (tb.length ? `<div class="qt">${tb.map(t => `<div class="qt-t">${t.name ? `<b>${esc(t.name)}</b>` : ''}${miniTbl(t, 'qt-tb')}</div>`).join('')}</div>` : '');
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function toast(t) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(() => el.remove(), 1800); }
function sheet(html) { closeSheet(); const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheet'; bg.innerHTML = '<div class="sheet"><div class="grab"></div>' + html + '</div>'; bg.addEventListener('click', e => { if (e.target === bg) closeSheet(); }); document.body.appendChild(bg); }
function ask(msg, yes, fn) {
  sheet(`<div class="q" style="font-weight:600">${esc(msg)}</div><div class="grid2" style="margin-top:12px"><button class="btn line" onclick="closeSheet()">취소</button><button class="btn" id="askYes">${esc(yes)}</button></div>`);
  $('#askYes').onclick = () => { closeSheet(); fn(); };
}
function closeSheet() { const s = $('#sheet'); if (s) s.remove(); }
const dtag = d => `<span class="tag d${d}">${DLABEL[d]}</span>`;

// ───────── 라우팅 ─────────
let view = 'home', P = {}, QS = null, timerId = null;
const TABS = [['home', '홈', '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'], ['practice', '문제', '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>'],
  ['wrong', '오답', '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'], ['concepts', '개념', '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>'], ['stats', '분석', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>']];
// 풀이를 시작한 화면 기억 → 그만두거나 결과에서 그 화면으로 복귀
let QFROM = { v: 'home', p: {} };
const BACKL = { concept: '개념으로', concepts: '개념 목록으로', wrong: '오답노트로', stats: '분석으로', practice: '문제 설정으로', mockresult: '모의고사 결과로', flash: '플래시카드로' };
function backTo() { const f = QFROM || {}; if (!f.v || f.v === 'quiz' || f.v === 'result' || f.v === 'mockrun') return go('home'); go(f.v, f.p); }
function go(v, p) { if (v === 'quiz' && view !== 'quiz' && view !== 'result') QFROM = { v: view, p: P }; go0(v, p); }
function go0(v, p) { if (timerId && v !== 'mockrun') { clearInterval(timerId); timerId = null; } if (v === 'quiz') snapQS(); view = v; P = p || {}; render(); window.scrollTo(0, 0); }
function renderTabs() {
  const hide = view === 'quiz' || view === 'mockrun';
  $('#tabbar').style.display = hide ? 'none' : 'flex';
  document.body.style.paddingBottom = hide ? 'env(safe-area-inset-bottom)' : '';
  const root = { home: 'home', practice: 'practice', quiz: 'practice', result: 'practice', wrong: 'wrong', concepts: 'concepts', concept: 'concepts', stats: 'stats' }[view === 'result' && /^concept/.test(QFROM.v) ? 'concept' : view] || 'home';
  $('#tabbar').innerHTML = TABS.map(([k, l, ic]) => `<button class="${root === k ? 'on' : ''}" onclick="go('${k}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic}</svg>${l}</button>`).join('');
}
function render() {
  renderTabs();
  const f = { home, practice, quiz, result, wrong, concepts, concept, stats, mock, mockrun, mockresult, flash, settings }[view];
  $('#app').innerHTML = '<div class="wrap">' + f() + '</div>';
  inkMount();
}

// ───────── 홈 ─────────
function home() {
  const o = overall(), td = S.days[today()] || { n: 0, c: 0 }, w = weakList().slice(0, 3), wn = wrongIds().length, dd = dday();
  const goalP = Math.min(1, td.n / S.set.goal);
  return `
  <div class="top"><div><div class="sub">SQLD 63회</div><h1>${dd > 0 ? 'D-' + dd : dd === 0 ? 'D-DAY' : '시험 종료'}</h1></div>
    <button class="icon-btn" onclick="go('settings')">설정</button></div>
  <div class="hgrid"><div class="hl"><div class="card">
    <div class="top"><b>오늘 목표</b><span class="sub">${td.n} / ${S.set.goal}문항 · 연속 ${streakDays()}일</span></div>
    <div class="bar ${goalP >= 1 ? 'high' : ''}" style="margin-top:10px"><i style="width:${goalP * 100}%"></i></div>
    <div class="grid3" style="margin-top:14px">
      <div class="stat"><b>${o.solved}</b><span>푼 문제 / ${o.total}</span></div>
      <div class="stat"><b>${pct(o.acc)}</b><span>전체 정답률</span></div>
      <div class="stat"><b>${wn}</b><span>오답노트</span></div>
    </div>
  </div>
  ${rvCard(0)}
  <div class="grid2">
    ${resumeInfo('practice') ? `<button class="btn" onclick="resumeQS('practice')">이어서 풀기 <span style="opacity:.8;font-weight:500">· ${resumeInfo('practice').left}문제 남음</span></button>` : `<button class="btn" onclick="quickStart()">새 문제 20개 풀기</button>`}
    <button class="btn ghost" onclick="go('mock')">실전 모의고사</button>
  </div>
  <div class="grid2" style="margin-top:10px">
    ${resumeInfo('wrong') ? `<button class="btn line" onclick="resumeQS('wrong')">오답 이어서 풀기 · ${resumeInfo('wrong').left}</button>` : `<button class="btn line" onclick="startWrong()" ${wn ? '' : 'disabled'}>오답 다시 풀기</button>`}
    <button class="btn line" onclick="go('flash')">플래시카드</button>
  </div>
  ${(() => { const un = BANK.filter(q => !S.att[q.id]); const g = k => un.filter(q => GRP(q) === k).length;
    return `<div class="card"><div class="top"><b>안 푼 문제 ${un.length}개</b><span class="sub">전체 ${BANK.length}개 중</span></div>
    <div class="rounds" style="margin:6px 0 10px">${[['k', '핵심기출'], ['b', '기본'], ['g', '기출변형'], ['x', '실전형'], ['y', '노랭이']].map(([k, l]) => `<button class="chip" ${g(k) ? '' : 'disabled'} onclick="startPractice({un:1,g:'${k}',n:20,order:'rand',title:'안 푼 ${l}'})">${l} ${g(k)}</button>`).join('')}</div>
    ${un.length ? `<button class="btn ghost" onclick="startPractice({un:1,n:20,order:'rand',title:'안 푼 문제'})">안 푼 문제 20개 풀기</button>` : '<div class="sub">모든 문제를 한 번씩 풀었어요.</div>'}</div>`; })()}</div><div class="hr">
  <h2>약한 개념</h2>
  ${w.length ? w.map(x => conceptRow(x.c, x.s)).join('') : '<div class="card sub">개념당 3문제 이상 풀면 약한 개념을 찾아드려요.</div>'}
  </div><div class="hd">
  <h2>난이도별 바로 풀기</h2>
  <div class="grid3">${[1, 2, 3].map(d => `<button class="btn line" onclick="startPractice({d:[${d}],n:20})">${DLABEL[d]} 20</button>`).join('')}</div>
  ${kcCard()}
  <div class="card" style="margin-top:10px"><div class="top"><b>실전형 ${BANK.filter(q => GRP(q) === 'x').length}문항</b><span class="sub">${overall(q => GRP(q) === 'x').solved}문항 풀이</span></div>
    <div class="sub" style="margin:6px 0 10px">52~62회 기출 패턴(표 주고 결과 고르기, 결과가 다른 SQL 찾기, 여러 개념 섞기)으로 만든 문제</div>
    <button class="btn line" onclick="startPractice({g:'x',n:20,order:'new',title:'실전형'})">실전형 20문항</button></div>
  <div class="card"><div class="top"><b>기출변형 ${BANK.filter(q => GRP(q) === 'g').length}문항</b><span class="sub">${overall(q => GRP(q) === 'g').solved}문항 풀이</span></div>
    <div class="sub" style="margin:6px 0 10px">52~62회 복원 기출의 출제 포인트는 그대로 두고 테이블·숫자·조건을 바꾼 문제. 회차를 누르면 그 회차 변형 문제를 원래 번호 순서로 풀어요.</div>
    <div class="rounds">${ROUNDS.map(r => { const ids = BANK.filter(q => q.src.startsWith('기출변형 · ' + r + '회')); const sv = ids.filter(q => S.att[q.id]).length; return `<button class="chip ${sv === ids.length ? 'on' : ''}" onclick="startPractice({rd:${r},n:99,order:'seq',un:${sv && sv < ids.length ? 1 : 0},title:'${r}회 ${sv && sv < ids.length ? '남은 문제' : '기출변형'}'})">${r}회 <span style="opacity:.7">${sv}/${ids.length}</span></button>`; }).join('')}</div>
    <button class="btn line" style="margin-top:8px" onclick="startPractice({g:'g',n:20,order:'new',title:'기출변형'})">전 회차 섞어서 20문항</button></div>
  <div class="card"><div class="top"><b>노랭이 스타일 ${BANK.filter(q => GRP(q) === 'y').length}문항</b><span class="sub">${overall(q => GRP(q) === 'y').solved}문항 풀이</span></div>
    <div class="sub" style="margin:6px 0 10px">노랭이 단원 순서와 문제 스타일을 따라 새로 만든 문제(원문 아님) · 개편 범위만</div>
    <button class="btn line" onclick="startPractice({g:'y',n:20,order:'new',title:'노랭이 스타일'})">노랭이 스타일 20문항</button></div></div></div>
  `;
}
function kcCard() {
  const all = BANK.filter(q => GRP(q) === 'k'); if (!all.length) return '';
  const subj = k => all.filter(q => q.src.startsWith('핵심기출 · ' + k + '과목'));
  const chip = k => { const ids = subj(k), sv = ids.filter(q => S.att[q.id]).length, part = sv && sv < ids.length;
    return `<button class="chip ${sv === ids.length ? 'on' : ''}" onclick="startPractice({g:'k',ks:${k},n:999,order:'seq',un:${part ? 1 : 0},title:'핵심기출 ${k}과목${part ? ' 남은 문제' : ''}'})">${k}과목 순서대로 <span style="opacity:.7">${sv}/${ids.length}</span></button>`; };
  const dchip = d => { const n = all.filter(q => q.d === d).length; return `<button class="chip" ${n ? '' : 'disabled'} onclick="startPractice({g:'k',d:[${d}],n:20,order:'new',title:'핵심기출 ${DLABEL[d]}'})">${DLABEL[d]} ${n}</button>`; };
  return `<div class="card" style="margin-top:10px"><div class="top"><b>핵심기출 ${all.length}문항</b><span class="sub">${overall(q => GRP(q) === 'k').solved}문항 풀이</span></div>
    <div class="sub" style="margin:6px 0 10px">SQL 자격검정 실전문제 원문 · 1과목 ${subj(1).length} + 2과목 ${subj(2).length}. 정답은 답지 기준, 해설과 보기별 오답 이유는 새로 정리</div>
    <div class="rounds">${chip(1)}${chip(2)}</div>
    <div class="rounds" style="margin-top:4px">${[1, 2, 3, 4].map(dchip).join('')}</div>
    <button class="btn line" style="margin-top:8px" onclick="startPractice({g:'k',n:20,order:'new',title:'핵심기출'})">핵심기출 섞어서 20문항</button></div>`;
}
function conceptRow(c, s) {
  return `<div class="card" onclick="go('concept',{id:'${c.id}'})">
    <div class="top"><div><span class="tag">${c.s}과목</span><b>${esc(c.name)}</b></div><b class="${lvl(s.acc) === 'low' ? '' : ''}">${pct(s.acc)}</b></div>
    <div class="bar ${lvl(s.acc)}" style="margin-top:8px"><i style="width:${(s.acc || 0) * 100}%"></i></div>
    <div class="sub" style="margin-top:6px">${s.c}/${s.n} 정답 · ${s.solved}/${s.total}문항 풀이</div></div>`;
}
function quickStart() { startPractice({ n: 20, order: 'new' }); }

// ───────── 문제 설정 ─────────
let PSET = { s: 0, g: 'a', un: 0, d: [1, 2, 3, 4], n: 20, order: 'new', cs: [] };
function practice() {
  const units = [...new Set(CONCEPTS.filter(c => !PSET.s || c.s === PSET.s).map(c => c.unit))];
  const pool = poolFor(PSET);
  return `<h1>문제 풀기</h1><div class="sub">총 ${BANK.length}문항 · 조건에 맞는 문제 ${pool.length}개 · 채점 기준 Oracle 19c 이하(시험 기준)</div>
  <div class="card"><b>과목</b><div class="seg">${[[0, '전체'], [1, '1과목'], [2, '2과목']].map(([v, l]) => `<button class="${PSET.s === v ? 'on' : ''}" onclick="PSET.s=${v};PSET.cs=[];render()">${l}</button>`).join('')}</div>
  <b>문제 묶음</b><div class="seg">${['a', 'k', 'b', 'g', 'x', 'y'].map(g => `<button class="${PSET.g === g ? 'on' : ''}" onclick="PSET.g='${g}';render()">${GLABEL[g]}</button>`).join('')}</div>
  <b>풀이 범위</b><div class="seg">${[[0, '전체'], [1, '안 푼 문제만']].map(([v, l]) => `<button class="${PSET.un === v ? 'on' : ''}" onclick="PSET.un=${v};render()">${l}</button>`).join('')}</div>
  <b>난이도</b><div class="seg">${[1, 2, 3, 4].map(d => `<button class="${PSET.d.includes(d) ? 'on' : ''}" onclick="togD(${d})">${DLABEL[d]}</button>`).join('')}</div>
  <b>문항 수</b><div class="seg">${[10, 20, 30, 50].map(n => `<button class="${PSET.n === n ? 'on' : ''}" onclick="PSET.n=${n};render()">${n}</button>`).join('')}</div>
  <b>순서</b><div class="seg">${[['new', '안 푼 것 먼저'], ['rand', '무작위'], ['weak', '약점 우선']].map(([v, l]) => `<button class="${PSET.order === v ? 'on' : ''}" onclick="PSET.order='${v}';render()">${l}</button>`).join('')}</div></div>
  <div class="card"><div class="top"><b>개념 선택</b><button class="sub" onclick="PSET.cs=[];render()">전체 해제</button></div>
  <div class="sub" style="margin:4px 0 8px">선택하지 않으면 전체 개념에서 출제</div>
  ${units.map(u => `<div style="margin-top:8px"><div class="sub">${esc(u)}</div>${CONCEPTS.filter(c => c.unit === u && (!PSET.s || c.s === PSET.s)).map(c => `<button class="chip ${PSET.cs.includes(c.id) ? 'on' : ''}" onclick="togC('${c.id}')">${esc(c.name)}</button>`).join('')}</div>`).join('')}
  </div>
  <button class="btn" onclick="startPractice(PSET)" ${pool.length ? '' : 'disabled'}>${Math.min(PSET.n, pool.length)}문항 시작</button>`;
}
function togD(d) { const i = PSET.d.indexOf(d); if (i >= 0) { if (PSET.d.length > 1) PSET.d.splice(i, 1); } else PSET.d.push(d); render(); }
function togC(id) { const i = PSET.cs.indexOf(id); if (i >= 0) PSET.cs.splice(i, 1); else PSET.cs.push(id); render(); }
function poolFor(o) {
  return BANK.filter(q => (!o.un || !S.att[q.id]) && (!o.rd || q.src.startsWith('기출변형 · ' + o.rd + '회')) && (!o.ks || q.src.startsWith('핵심기출 · ' + o.ks + '과목')) && (!o.g || o.g === 'a' || GRP(q) === o.g) && (!o.s || CMAP[q.c].s === o.s) && (!o.d || o.d.includes(q.d)) && (!o.cs || !o.cs.length || o.cs.includes(q.c)));
}
function startPractice(o) {
  o = Object.assign({ s: 0, d: [1, 2, 3, 4], n: 20, order: 'new', cs: [] }, o);
  let pool = poolFor(o);
  if (o.order === 'seq') pool = pool.slice();
  else if (o.order === 'new') pool = [...shuffle(pool.filter(q => !S.att[q.id])), ...shuffle(pool.filter(q => S.att[q.id]))];
  else if (o.order === 'weak') { const sc = id => { const s = conceptStat(QMAP[id].c); return s.n ? (s.c + 1) / (s.n + 2) : 0.5; }; pool = shuffle(pool).sort((a, b) => sc(a.id) - sc(b.id)); }
  else pool = shuffle(pool);
  const ids = pool.slice(0, o.n).map(q => q.id);
  if (!ids.length) return toast('조건에 맞는 문제가 없어요');
  INK.s = {};
  QS = { ids, i: 0, mode: o.mode || 'practice', res: {}, pick: null, shown: false, title: o.title || '문제 풀기' };
  go('quiz');
}
function startReview() { const ids = shuffle(dueIds()); if (!ids.length) return toast('오늘 복습할 문제가 없어요'); INK.s = {}; QS = { ids, i: 0, mode: 'wrong', res: {}, pick: null, shown: false, title: '오늘 복습' }; go('quiz'); }
function rvCard(inWrong) {
  const dn = dueIds().length, nx = nextDue();
  if (dn) return `<div class="card rvcard"><div class="top"><b>오늘 복습할 오답 ${dn}개</b><span class="sub">1일 · 3일 · 7일 간격</span></div>
    <div class="sub" style="margin:4px 0 10px">날짜를 두고 3번 맞히면 오답노트에서 빠져요</div><button class="btn" onclick="startReview()">복습 시작</button></div>`;
  return inWrong && nx ? `<div class="card sub">오늘 복습은 끝났어요 · 다음 복습 ${md2(nx)} <span style="opacity:.7">(1일·3일·7일 간격)</span></div>` : '';
}
function startWrong() { const ids = shuffle(wrongIds()); if (!ids.length) return toast('오답이 없어요'); QS = { ids, i: 0, mode: 'wrong', res: {}, pick: null, shown: false, title: '오답 다시 풀기' }; go('quiz'); }

// ───────── 풀이 화면 ─────────
function quiz() {
  const q = QMAP[QS.ids[QS.i]], c = CMAP[q.c], sh = QS.shown, ok = QS.pick === q.a;
  return `<div class="top" style="margin-top:4px"><button class="icon-btn" onclick="quitQuiz()">✕</button>
    <span class="sub">${QS.title} · ${QS.i + 1} / ${QS.ids.length}</span>
    <button class="icon-btn" onclick="showTables()">EMP</button></div>
  <div class="bar" style="margin:10px 0 14px"><i style="width:${Object.keys(QS.res).length / QS.ids.length * 100}%"></i></div>
  <div class="inkw inkall ${INK.on ? 'inking' : ''}${(INK.s[q.id] || []).length ? ' hasink' : ''}" id="inkw" data-q="${q.id}"><div class="qa"><div class="qa-l">
  <div class="top"><div>${dtag(q.d)}<span class="tag">${c.s}과목</span><span class="tag">${esc(c.name)}</span></div>${inkBar()}</div>
  ${tblBlock(q)}
  <div class="q">${md(q.q)}</div>${qExtra(q)}${figs(q)}
  ${qCode(q)}
  </div><div class="qa-r">
  ${q.o.map((t, k) => { let cl = ''; if (sh) { if (k === q.a) cl = 'right'; else if (k === QS.pick) cl = 'wrong'; } else if (k === QS.pick) cl = 'sel';
    return `<button class="opt ${cl}${sh && k === QS.pick && k !== q.a ? ' open' : ''}${sh && q.w && k !== q.a ? ' hasw' : ''}" onclick="optTap(this, ${k})"><span class="n">${k + 1}</span><span class="ot">${ot(t)}${sh ? whyH(q, k) : ''}</span></button>`; }).join('')}
  ${sh && q.w ? '<div class="why-hint">보기를 누르면 왜 틀렸는지 보여요</div>' : ''}
  ${sh ? `<div class="exp ${ok ? 'ok' : 'no'}"><b>${ok ? '정답' : '오답 · 정답 ' + MK[q.a]}</b><br>${md(q.e)}</div>
    ${QS.rv && QS.rv[q.id] ? `<div class="rvnote">${esc(QS.rv[q.id])}</div>` : ''}
    ${plusH(q)}
    <div class="row" style="flex-wrap:wrap"><button class="chip c" onclick="showConcept('${c.id}')">개념 보기: ${esc(c.name)}</button>
    <button class="chip ${S.conf[q.id] ? 'on' : ''}" onclick="togConf(${q.id})">${S.conf[q.id] ? '헷갈림 표시됨' : '헷갈림 표시'}</button></div>
    <div class="navrow"><button class="btn line" onclick="prevQ()" ${QS.i ? '' : 'disabled'}>‹ 이전</button><button class="btn" onclick="nextQ()">${QS.i + 1 < QS.ids.length ? '다음 문제 ›' : '결과 보기'}</button></div>`
  : `<div class="navrow"><button class="btn line" onclick="prevQ()" ${QS.i ? '' : 'disabled'}>‹ 이전</button><button class="btn" onclick="check()" ${QS.pick == null ? 'disabled' : ''}>정답 확인</button></div>`}
  </div></div><canvas class="ink" id="ink"></canvas></div>
  <div class="sub" style="text-align:center;margin-top:14px">${esc(q.src)} · #${q.id}</div>`;
}
function pick(k) { if (QS.shown) return; QS.pick = k; render(); }
function check() { const q = QMAP[QS.ids[QS.i]]; if (QS.pick == null) return; const ok = QS.pick === q.a; QS.res[q.id] = ok; (QS.picks = QS.picks || {})[q.id] = QS.pick; const rm = record(q.id, ok); if (rm) (QS.rv = QS.rv || {})[q.id] = rm; QS.shown = true; snapQS(); render(); }
// 이전·다음 이동: 이미 푼 문제는 고른 답과 해설이 보이는 상태로 연다
function gotoQ(i) {
  QS.i = i; const id = QS.ids[i]; QS.picks = QS.picks || {};
  if (id in QS.res) { QS.pick = id in QS.picks ? QS.picks[id] : null; QS.shown = true; } else { QS.pick = null; QS.shown = false; }
  render(); window.scrollTo(0, 0);
}
function prevQ() { if (QS.i > 0) gotoQ(QS.i - 1); }
function nextQ() { if (QS.i + 1 < QS.ids.length) gotoQ(QS.i + 1); else go('result'); }
function quitQuiz() {
  snapQS();
  if (QS.mode === 'wrong') { const r = S.resume.wrong; if (r) toast(`저장했어요 · ${r.ids.length - r.i}문제 남음`); if (['concept', 'mockresult', 'stats'].includes(QFROM.v)) backTo(); else go('wrong'); return; }
  if (Object.keys(QS.res).length) go('result'); else backTo();
}
// 풀던 세트 저장 · 이어서 풀기 (오답 / 일반 따로)
function snapQS() {
  if (!QS) return; const k = QS.mode === 'wrong' ? 'wrong' : 'practice';
  S.resume = S.resume || {};
  let i = QS.ids.findIndex(id => !(id in QS.res));
  if (i < 0) delete S.resume[k];
  else S.resume[k] = { ids: QS.ids, i, res: QS.res, picks: QS.picks || {}, title: QS.title, mode: QS.mode };
  save();
}
function resumeInfo(k) { const r = S.resume && S.resume[k]; if (!r) return null; const left = r.ids.length - r.i; return left > 0 ? { r, left } : null; }
function resumeQS(k) {
  const x = resumeInfo(k); if (!x) return;
  QS = { ids: x.r.ids.filter(id => QMAP[id]), i: x.r.i, mode: x.r.mode, res: x.r.res || {}, picks: x.r.picks || {}, pick: null, shown: false, title: x.r.title };
  go('quiz');
}
function togConf(id) { if (S.conf[id]) delete S.conf[id]; else S.conf[id] = 1; save(); render(); }
function showConcept(id) { sheet(conceptBody(CMAP[id], true)); }

// 문제 속 [테이블] 블록은 표로, 나머지는 코드로
function codeHTML(code) {
  if (!code) return '';
  const out = []; let buf = [];
  const flush = () => { while (buf.length && !buf[buf.length - 1].trim()) buf.pop(); if (buf.length) out.push(`<pre class="code">${esc(buf.join('\n'))}</pre>`); buf = []; };
  for (let i = 0; i < code.length; i++) {
    const m = /^\[([^\]]+)\]\s*$/.exec(code[i]);
    if (m && i + 2 < code.length) {
      const rows = []; let j = i + 1;
      while (j < code.length && code[j].trim()) { rows.push(code[j].trim().split(/\s{2,}/)); j++; }
      if (!rows.every(r => r.length === rows[0].length)) { const r2 = code.slice(i + 1, j).map(l => l.trim().split(/\s+/)); if (r2.every(r => r.length === r2[0].length)) rows.splice(0, rows.length, ...r2); }
      if (rows.length >= 2 && rows.every(r => r.length === rows[0].length)) {
        flush();
        out.push(`<div class="qt qt-in"><div class="qt-t"><b>${esc(m[1])}</b><table class="t qt-tb"><tr>${rows[0].map(x => `<th>${esc(x)}</th>`).join('')}</tr>${rows.slice(1).map(r => '<tr>' + r.map(x => `<td>${x === 'NULL' ? '<span class="muted">NULL</span>' : esc(x)}</td>`).join('') + '</tr>').join('')}</table></div></div>`);
        i = j; continue;
      }
    }
    buf.push(code[i]);
  }
  flush();
  return out.join('');
}
// ───────── 문제 위 테이블 ─────────
const EMP_COLS = ['EMPNO', 'ENAME', 'JOB', 'MGR', 'HIREDATE', 'SAL', 'COMM', 'DEPTNO'], DEPT_COLS = ['DEPTNO', 'DNAME', 'LOC'];
function needTables(q) { return q.t || []; }
function tblHTML(name, cols, rows) {
  return `<div class="qt-t"><b>${name}</b><table class="t qt-tb"><tr>${cols.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => '<tr>' + r.map(x => `<td>${x == null ? '<span class="muted">NULL</span>' : x}</td>`).join('') + '</tr>').join('')}</table></div>`;
}
function tblBlock(q, always) {
  const ns = needTables(q); if (!ns.length) return '';
  if (S.set.tfold && !always) return `<button class="tfold-open" onclick="S.set.tfold=0;save();render()">▸ 테이블 펼치기 (${ns.join(' · ')})</button>`;
  return `<div class="qt">${always ? '' : `<button class="tfold" onclick="S.set.tfold=1;save();render()">접기</button>`}${ns.map(n => n === 'EMP' ? tblHTML('EMP', EMP_COLS, EMP_ROWS) : tblHTML('DEPT', DEPT_COLS, DEPT_ROWS)).join('')}</div>`;
}

// ───────── 필기 ─────────
const INK = { on: false, col: '#e5484d', er: false, s: {}, pen: false };
const INK_COLS = ['#e5484d', '#2f6fde', '#1f9d55'];
function inkBar() {
  if (!INK.on) return `<button class="inkbtn" onclick="inkToggle()">✎ 필기</button>`;
  return `<div class="inkbar">${INK_COLS.map(c => `<button class="dot ${!INK.er && INK.col === c ? 'on' : ''}" style="--c:${c}" onclick="INK.col='${c}';INK.er=false;inkBarRefresh()"></button>`).join('')}
    <button class="inkbtn ${INK.er ? 'on' : ''}" onclick="INK.er=!INK.er;inkBarRefresh()">지우개</button>
    <button class="inkbtn" onclick="inkClear()">전체 지우기</button>
    <button class="inkbtn on" onclick="inkToggle()">완료</button></div>`;
}
function inkToggle() { INK.on = !INK.on; INK.er = false; render(); }
// 애플펜슬 몸통 두 번 탭(앱이 호출): 문제 풀이·모의고사 화면에서만 필기 켜기/끄기
window.onPencilTap = () => {
  if ((view !== 'quiz' && view !== 'mockrun' && view !== 'concept') || document.getElementById('sheet')) return;
  INK.pen = true; inkToggle(); toast(INK.on ? '필기 켜짐' : '필기 꺼짐');
};
function inkBarRefresh() { const b = document.querySelector('.inkbar'); if (b) b.outerHTML = inkBar(); }
function inkClear() { const w = $('#inkw'); if (!w) return; INK.s[w.dataset.q] = []; inkDraw(); }
function inkKey() { const w = $('#inkw'); return w ? w.dataset.q : null; }
function inkStroke(ctx, st) {
  const p = st.p; if (!p.length) return;
  ctx.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
  ctx.strokeStyle = st.c; ctx.lineWidth = st.e ? 22 : 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
  if (p.length === 1) ctx.lineTo(p[0][0] + 0.1, p[0][1] + 0.1);
  for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
  ctx.stroke();
}
// 캔버스 픽셀 배율 (iOS 캔버스 면적 한도 16.7M 픽셀 안으로)
function inkScale(cv) { return cv.width / (parseFloat(cv.style.width) || cv.width || 1); }
function inkDraw() {
  const cv = $('#ink'); if (!cv) return; const ctx = cv.getContext('2d'), k = inkScale(cv);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(k, 0, 0, k, 0, 0);
  (INK.s[inkKey()] || []).forEach(st => inkStroke(ctx, st));
}
let inkRO = null;
function inkMount() {
  const w = $('#inkw'), cv = $('#ink'); if (inkRO) { inkRO.disconnect(); inkRO = null; } if (!w || !cv) return;
  const size = () => {
    // 내용이 짧아도 화면 맨 아래까지 필기 영역으로 (아래 빈 곳에 손바닥이 닿아도 필기 영역 안)
    const mh = Math.max(0, Math.floor(window.innerHeight - (w.getBoundingClientRect().top + window.scrollY) - 12)) + 'px';
    if (w.style.minHeight !== mh) w.style.minHeight = mh;
    const W = w.offsetWidth, H = w.offsetHeight; if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(16e6 / (W * H))), cw = Math.floor(W * dpr), ch = Math.floor(H * dpr);
    if (cv.width !== cw || cv.height !== ch || cv.style.width !== W + 'px' || cv.style.height !== H + 'px') { cv.width = cw; cv.height = ch; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    inkDraw(); };
  size(); if (window.ResizeObserver) { inkRO = new ResizeObserver(size); inkRO.observe(w); }
  // iOS: 필기 중 터치가 스크롤·탭으로 넘어가지 않게 터치 기본 동작을 막는다
  const stopTouch = e => { if (INK.on) e.preventDefault(); };
  cv.addEventListener('touchstart', stopTouch, { passive: false });
  cv.addEventListener('touchmove', stopTouch, { passive: false });
  cv.addEventListener('touchend', stopTouch, { passive: false });
  let cur = null, pan = null, penAt = 0; const tch = new Set();
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10]; };
  const dropCur = () => { if (!cur) return; const l = INK.s[inkKey()] || [], i = l.indexOf(cur); if (i >= 0) l.splice(i, 1); cur = null; inkDraw(); };
  const startPan = e => { pan = { id: e.pointerId, y: e.clientY, go: false }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} };
  cv.onpointerdown = e => {
    if (!INK.on) return;
    e.preventDefault();
    if (e.pointerType === 'pen') { INK.pen = true; pan = null; penAt = Date.now(); if (cur && cur.t !== 'pen') dropCur(); }
    else if (e.pointerType === 'touch') {
      tch.add(e.pointerId);
      if (tch.size >= 2) { if (cur && cur.t === 'touch') dropCur(); if (!cur && Date.now() - penAt > 600) startPan(e); return; } // 두 손가락: 스크롤
      if (INK.pen) return; // 펜슬을 쓰고 있으면 한 손가락·손바닥 터치는 무시
    }
    if (cur) return;
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const k = inkKey(); cur = { c: INK.col, e: INK.er, p: [pt(e)], id: e.pointerId, t: e.pointerType }; (INK.s[k] = INK.s[k] || []).push(cur); w.classList.add('hasink'); inkDraw();
  };
  cv.onpointermove = e => {
    if (e.pointerType === 'pen') penAt = Date.now();
    if (pan && e.pointerId === pan.id) { e.preventDefault(); const dy = e.clientY - pan.y;
      if (pan.go || Math.abs(dy) > 14) { pan.go = true; window.scrollBy(0, -dy); pan.y = e.clientY; } return; }
    if (!cur || e.pointerId !== cur.id) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(ev => cur.p.push(pt(ev)));
    const ctx = cv.getContext('2d'), k = inkScale(cv); ctx.setTransform(k, 0, 0, k, 0, 0);
    inkStroke(ctx, { c: cur.c, e: cur.e, p: cur.p.slice(-evs.length - 1) });
  };
  cv.onpointerup = cv.onpointercancel = e => { if (e.pointerType === 'pen') penAt = Date.now(); tch.delete(e.pointerId); if (pan && e.pointerId === pan.id) pan = null; if (cur && e.pointerId === cur.id) cur = null; };
}
// 필기 중에는 필기 도구 말고는 아무것도 눌리지 않게 (보기·버튼·상단 버튼 포함)
window.addEventListener('click', e => {
  if (!INK.on || !$('#inkw')) return;
  if (e.target && e.target.closest && e.target.closest('.inkbar, .inkbtn, #sheet')) return;
  e.stopPropagation(); e.preventDefault();
}, true);

function showTables() {
  const th = a => '<tr>' + a.map(x => `<th>${x}</th>`).join('') + '</tr>';
  const tr = r => '<tr>' + r.map(x => `<td>${x == null ? '<span class="muted">NULL</span>' : x}</td>`).join('') + '</tr>';
  sheet(`<b>EMP</b><div class="scroll-x"><table class="t">${th(['EMPNO', 'ENAME', 'JOB', 'MGR', 'HIREDATE', 'SAL', 'COMM', 'DEPTNO'])}${EMP_ROWS.map(tr).join('')}</table></div>
  <b style="display:block;margin-top:14px">DEPT</b><table class="t">${th(['DEPTNO', 'DNAME', 'LOC'])}${DEPT_ROWS.map(tr).join('')}</table>
  <div class="sub" style="margin-top:10px">조직도: KING ─ JONES(SCOTT─ADAMS, FORD─SMITH) · BLAKE(ALLEN, WARD, MARTIN, TURNER, JAMES) · CLARK(MILLER)</div>`);
}
function result() {
  const ids = Object.keys(QS.res).map(Number), ok = ids.filter(id => QS.res[id]).length, wrongs = ids.filter(id => !QS.res[id]);
  const byC = {}; ids.forEach(id => { const c = QMAP[id].c; byC[c] = byC[c] || [0, 0]; byC[c][0]++; if (QS.res[id]) byC[c][1]++; });
  const weak = Object.entries(byC).filter(([, v]) => v[1] < v[0]).sort((a, b) => a[1][1] / a[1][0] - b[1][1] / b[1][0]);
  return `<h1>결과</h1><div class="card" style="text-align:center"><div class="big">${ok} / ${ids.length}</div><div class="sub">정답률 ${pct(ids.length ? ok / ids.length : null)}</div></div>
  ${weak.length ? `<h2>이번에 틀린 개념</h2><div class="cgrid">${weak.map(([cid, v]) => `<div class="card" onclick="go('concept',{id:'${cid}'})"><div class="top"><b>${esc(CMAP[cid].name)}</b><span class="sub">${v[1]}/${v[0]}</span></div></div>`).join('')}</div>` : '<div class="card">전부 맞혔어요.</div>'}
  ${wrongs.length ? `<button class="btn" onclick="QS={ids:${JSON.stringify(wrongs)},i:0,mode:'wrong',res:{},pick:null,shown:false,title:'틀린 문제 다시'};go('quiz')">틀린 ${wrongs.length}문제 바로 다시 풀기</button>` : ''}
  ${BACKL[QFROM.v] ? `<button class="btn" style="margin-top:10px" onclick="backTo()">← ${BACKL[QFROM.v]} 돌아가기</button>` : ''}
  <button class="btn line" style="margin-top:10px" onclick="go('home')">홈으로</button>`;
}

// ───────── 오답노트 ─────────
function wrong() {
  const ids = wrongIds(); const g = {};
  ids.forEach(id => { const c = QMAP[id].c; (g[c] = g[c] || []).push(id); });
  const keys = Object.keys(g).sort((a, b) => g[b].length - g[a].length);
  return `<h1>오답노트</h1><div class="sub">틀린 문제와 헷갈림 표시한 문제 ${ids.length}개 · 날짜를 두고 3번 맞히면 빠져요</div>
  ${rvCard(1)}
  ${(() => { const x = resumeInfo('wrong'); if (!x) return ''; const done = x.r.i, tot = x.r.ids.length, ok = Object.values(x.r.res || {}).filter(Boolean).length;
    return `<div class="card"><div class="top"><b>풀던 오답 이어서</b><span class="sub">${esc(x.r.title)}</span></div>
    <div class="bar" style="margin:10px 0 6px"><i style="width:${done / tot * 100}%"></i></div>
    <div class="sub">${done}/${tot} 풀이 · 맞힘 ${ok} · ${x.left}문제 남음</div>
    <button class="btn" style="margin-top:10px" onclick="resumeQS('wrong')">이어서 풀기</button></div>`; })()}
  ${ids.length ? `<button class="btn ${resumeInfo('wrong') ? 'line' : ''}" style="margin:12px 0" onclick="startWrong()">${resumeInfo('wrong') ? '처음부터 새로 섞어서 풀기' : '전체 다시 풀기'}</button>` : '<div class="card">아직 오답이 없어요.</div>'}
  <div class="cgrid">${keys.map(k => `<div class="card"><div class="top"><b>${esc(CMAP[k].name)}</b><span class="pill">${g[k].length}</span></div>
    <div class="list">${g[k].map(id => { const q = QMAP[id], a = S.att[id] || {}; return `<div class="it" onclick="peek(${id})"><span>${dtag(q.d)}${esc(q.q.slice(0, 42))}${q.q.length > 42 ? '…' : ''}${snip(q) ? `<br><code style="font-size:12px">${esc(snip(q))}</code>` : ''}</span><span class="sub" style="text-align:right;white-space:nowrap">${a.wr ? '✕' + a.wr : ''}${S.conf[id] ? ' ?' : ''}${a.w ? '<br>' + rvTag(a) : ''}</span></div>`; }).join('')}</div>
    <div class="grid2" style="margin-top:10px"><button class="btn ghost" onclick="QS={ids:${JSON.stringify(g[k])},i:0,mode:'wrong',res:{},pick:null,shown:false,title:'오답 · ${esc(CMAP[k].name)}'};go('quiz')">이 개념 오답 풀기</button>
    <button class="btn line" onclick="go('concept',{id:'${k}'})">개념 공부</button></div></div>`).join('')}</div>`;
}
function snip(q) {
  if (!q.code) return '';
  const k = q.code.findIndex(x => /^\s*(SELECT|INSERT|UPDATE|DELETE|MERGE|CREATE|WITH|\(가\))/i.test(x));
  if (k < 0) return '';
  const t = q.code.slice(k).join(' ').replace(/\s+/g, ' ').trim();
  return t.length > 54 ? '…' + t.slice(-54) : t;
}
function optTap(el, k) { if (QS.shown) el.classList.toggle('open'); else pick(k); }
// 'N번과', 'N·M번과', 'N번(' 처럼 다른 문항을 가리키는 번호만 링크로 (부서번호 10~40은 제외)
function qref(h, self) {
  return h.replace(/((?:\d{2,4}·)*\d{2,4})번(?=과|와|\(|이 |의 |처럼| 결과| 규칙| 원리| 공식)/g, (m, g) => {
    const ids = g.split('·').map(Number);
    if (!ids.every(n => QMAP[n] && n !== self && ![10, 20, 30, 40].includes(n))) return m;
    return ids.map(n => `<a class="qref" onclick="event.stopPropagation();peek(${n})">${n}</a>`).join('·') + '번';
  });
}
function plusH(q) {
  return (q.kk ? `<div class="kbox"><b>핵심개념</b><ul>${q.kk.map(x => `<li>${qref(md(x), q.id)}</li>`).join('')}</ul></div>` : '') +
    (q.tip ? `<div class="tipbox"><b>꿀팁</b> ${qref(md(q.tip), q.id)}</div>` : '');
}
function whyH(q, k) { return q.w && k !== q.a && q.w[k] ? `<span class="why">✕ ${esc(q.w[k])}</span>` : ''; }
function peek(id) {
  const q = QMAP[id];
  sheet(`<div>${dtag(q.d)}<span class="tag">${esc(CMAP[q.c].name)}</span></div>${tblBlock(q, true)}<div class="q">${md(q.q)}</div>${qExtra(q)}${figs(q)}${qCode(q)}
  ${q.o.map((t, k) => `<div class="opt ${k === q.a ? 'right' : ''}${q.w && k !== q.a ? ' hasw' : ''}" onclick="this.classList.toggle('open')"><span class="n">${k + 1}</span><span class="ot">${ot(t)}${whyH(q, k)}</span></div>`).join('')}
  ${q.w ? '<div class="why-hint">보기를 누르면 왜 틀렸는지 보여요</div>' : ''}
  <div class="exp ok">${md(q.e)}</div>${plusH(q)}
  ${S.conf[id] ? `<button class="btn line" onclick="togConf(${id});closeSheet()">헷갈림 표시 해제</button>` : ''}`);
}

// ───────── 개념 ─────────
function concepts() {
  const done = Object.keys(S.cdone).length;
  const units = [...new Set(CONCEPTS.map(c => c.s + '|' + c.unit))];
  return `<h1>개념 학습</h1><div class="sub">${CONCEPTS.length}개 개념 중 ${done}개 학습 완료</div>
  <div class="ugrid">${units.map(u => { const [s, name] = u.split('|'); return `<section><h2>${s}과목 · ${esc(name)}</h2><div class="card list">${CONCEPTS.filter(c => c.s == s && c.unit === name).map(c => { const st = conceptStat(c.id);
    return `<div class="it" onclick="go('concept',{id:'${c.id}'})"><span>${S.cdone[c.id] ? '✓ ' : ''}${esc(c.name)}</span><span class="sub">${st.n ? pct(st.acc) : ''} ${st.total}문항</span></div>`; }).join('')}</div></section>`; }).join('')}</div>`;
}
function conceptBody(c, inSheet) {
  const st = conceptStat(c.id);
  return `<div class="sub">${c.s}과목 · ${esc(c.unit)}</div><h1 style="font-size:21px">${esc(c.name)}</h1>
  <div class="row" style="margin:6px 0 4px"><span class="pill">정답률 ${pct(st.acc)}</span><span class="sub">${st.solved}/${st.total}문항 풀이</span></div>
  <ul class="sum">${c.sum.map(t => `<li>${md(t)}</li>`).join('')}</ul>
  ${figs(c)}${c.ex ? `<pre class="code">${esc(c.ex.join('\n'))}</pre>` : ''}
  ${moreHTML(c)}
  ${c.trap ? `<div class="trap"><b>함정</b><br>${c.trap.map(md).join('<br>')}</div>` : ''}
  ${inSheet ? '' : `<div class="grid2" style="margin-top:14px">
    <button class="btn" onclick="startPractice({cs:['${c.id}'],n:${Math.min(20, st.total)},order:'new',title:'${esc(c.name)}'})">이 개념 문제 풀기</button>
    <button class="btn ${S.cdone[c.id] ? 'line' : 'ghost'}" onclick="togDone('${c.id}')">${S.cdone[c.id] ? '학습 완료 취소' : '학습 완료'}</button></div>
    <div class="grid2" style="margin-top:10px">${[1, 2, 3, 4].map(d => { const n = (BY_C[c.id] || []).filter(id => QMAP[id].d === d).length; return `<button class="btn line" ${n ? '' : 'disabled'} onclick="startPractice({cs:['${c.id}'],d:[${d}],n:${n},title:'${esc(c.name)}'})">${DLABEL[d]} ${n}</button>`; }).join('')}</div>${(() => { const un = (BY_C[c.id] || []).filter(id => !S.att[id]).length; return un ? `<button class="btn ghost" style="margin-top:8px" onclick="startPractice({cs:['${c.id}'],un:1,n:${un},order:'rand',title:'${esc(c.name)} · 안 푼 문제'})">이 개념에서 안 푼 문제 ${un}개</button>` : ''; })()}`}`;
}
// 개념 정리: 소제목·문단·목록·표·SQL 예시와 실행 결과
function moreHTML(c) {
  const B = (window.CMORE || {})[c.id]; if (!B) return '';
  const cell = x => x === 'NULL' ? '<span class="muted">NULL</span>' : md(x);
  const tb = (t, cls) => `<div class="otb"><table class="t ${cls}"><tr>${t.cols.map(x => `<th>${md(x)}</th>`).join('')}</tr>${t.rows.map(r => '<tr>' + r.map(x => `<td>${cell(x)}</td>`).join('') + '</tr>').join('')}</table></div>`;
  return `<div class="more"><div class="more-h">개념 정리</div>${B.map(b =>
    b.h ? `<h3>${md(b.h)}</h3>` : b.p ? `<p>${md(b.p)}</p>` : b.li ? `<ul>${b.li.map(x => `<li>${md(x)}</li>`).join('')}</ul>` :
    b.t ? tb(b.t, 'mt') : b.code ? `<pre class="code">${esc(b.code.join('\n'))}</pre>${b.out ? `<div class="mout"><span>실행 결과${b.out.rows.length ? '' : ' · 0건'}</span>${b.out.rows.length ? tb(b.out, 'mo') : ''}</div>` : ''}` : '').join('')}</div>`;
}
function concept() {
  const k = 'c_' + P.id;
  return `<div class="top" style="margin-top:4px"><button class="icon-btn" onclick="go('concepts')">← 개념 목록</button>${inkBar()}</div>
  <div class="inkw inkall ${INK.on ? 'inking' : ''}${(INK.s[k] || []).length ? ' hasink' : ''}" id="inkw" data-q="${k}"><div class="card cink" style="margin-top:12px">${conceptBody(CMAP[P.id])}</div><canvas class="ink" id="ink"></canvas></div>`;
}
function togDone(id) { if (S.cdone[id]) delete S.cdone[id]; else S.cdone[id] = today(); save(); render(); }

// ───────── 분석 ─────────
let STAB = 'weak';
function stats() {
  const s1 = overall(q => CMAP[q.c].s === 1), s2 = overall(q => CMAP[q.c].s === 2);
  const ds = [1, 2, 3, 4].map(d => overall(q => q.d === d));
  const days = Object.keys(S.days).sort().slice(-14);
  const maxN = Math.max(1, ...days.map(k => S.days[k].n));
  let list = CONCEPTS.map(c => ({ c, s: conceptStat(c.id) }));
  let few = [];
  if (STAB === 'weak') { few = list.filter(x => x.s.n && x.s.n < 3).sort(weakCmp); list = list.filter(x => x.s.n >= 3).sort(weakCmp); }
  else if (STAB === 'none') list = list.filter(x => !x.s.solved);
  return `<h1>분석</h1>
  <div class="grid2"><div class="card stat"><b>${pct(s1.acc)}</b><span>1과목 정답률 · ${s1.solved}/${s1.total}</span></div><div class="card stat"><b>${pct(s2.acc)}</b><span>2과목 정답률 · ${s2.solved}/${s2.total}</span></div></div>
  <div class="card"><b>난이도별</b>${ds.map((x, i) => `<div style="margin-top:10px"><div class="top"><span>${DLABEL[i + 1]}</span><span class="sub">${pct(x.acc)} · ${x.solved}/${x.total}</span></div><div class="bar ${lvl(x.acc)}"><i style="width:${(x.acc || 0) * 100}%"></i></div></div>`).join('')}</div>
  <div class="card"><b>최근 14일</b>${days.length ? `<div style="display:flex;align-items:flex-end;gap:4px;height:90px;margin-top:10px">${days.map(k => `<div style="flex:1;text-align:center"><div style="height:${S.days[k].n / maxN * 70}px;background:var(--pri);border-radius:4px 4px 0 0;opacity:${0.4 + 0.6 * S.days[k].c / S.days[k].n}"></div><div class="sub" style="font-size:9px">${k.slice(8)}</div></div>`).join('')}</div>` : '<div class="sub">아직 기록이 없어요</div>'}</div>
  ${S.mocks.length ? `<div class="card"><b>모의고사 기록</b><div class="list">${S.mocks.map((m, i) => [m, i]).slice(-5).reverse().map(([m, i]) => `<div class="it" ${m.ids ? `onclick="go('mockresult',Object.assign({past:1},S.mocks[${i}]))"` : ''}><span>${m.date}</span><span>${m.total}점 <span class="sub">(${m.s1}/${m.s2})</span> ${m.pass ? '합격' : '불합격'}${m.ids ? ' ›' : ''}</span></div>`).join('')}</div>
  ${(() => { const mw = mockWeak(); return mw.length ? `<div class="sub" style="margin-top:12px">모의고사에서 자주 틀린 개념</div><div class="rounds" style="margin-top:6px">${mw.map(([c, n]) => `<button class="chip" onclick="go('concept',{id:'${c}'})">${esc(CMAP[c].name)} ${n}</button>`).join('')}</div>` : ''; })()}</div>` : ''}
  <h2>개념별</h2>
  <div class="seg">${[['weak', '약한 순'], ['all', '전체'], ['none', '안 푼 개념']].map(([v, l]) => `<button class="${STAB === v ? 'on' : ''}" onclick="STAB='${v}';render()">${l}</button>`).join('')}</div>
  ${list.length ? `<div class="cgrid">${list.map(x => conceptRow(x.c, x.s)).join('')}</div>` : `<div class="card sub">${STAB === 'weak' && few.length ? '3번 이상 푼 개념이 아직 없어요' : '해당하는 개념이 없어요'}</div>`}
  ${few.length ? `<h2>기록 부족 <span class="sub" style="font-size:13px;font-weight:400">${few.length}개</span></h2><div class="sub" style="margin:-4px 0 10px">1~2번만 푼 개념 · 3번 이상 풀면 위 순위로 올라가요</div><div class="cgrid">${few.map(x => conceptRow(x.c, x.s)).join('')}</div>` : ''}`;
}

// ───────── 모의고사 ─────────
let MK_S = null;
function mock() {
  return `<button class="icon-btn" onclick="go('home')">← 홈</button><h1>실전 모의고사</h1>
  <div class="card"><ul class="sum"><li>50문항: 1과목 10 + 2과목 40, 문항당 2점</li><li>채점은 시험 기준(Oracle 19c 이하). 23ai에서 실습 결과가 다른 문제는 해설에 따로 적어 둠</li><li>제한 시간 90분, 다 풀고 제출하면 채점</li><li>60점 이상 + 과목별 40% 이상이면 합격 (1과목 8점, 2과목 32점 미만은 과락)</li><li>난이도는 초급 15% · 중급 40% · 고급 25% · 실전형 20% 비율로 섞음</li></ul></div>
  <button class="btn" onclick="startMock()">시작</button>`;
}
function pickMix(pool, n) {
  const want = { 1: Math.round(n * 0.15), 3: Math.round(n * 0.25), 4: Math.round(n * 0.2) }; want[2] = n - want[1] - want[3] - want[4];
  let out = [];
  [1, 2, 3, 4].forEach(d => { out = out.concat(shuffle(pool.filter(q => q.d === d)).slice(0, want[d])); });
  if (out.length < n) out = out.concat(shuffle(pool.filter(q => !out.includes(q))).slice(0, n - out.length));
  return out.map(q => q.id);
}
function startMock() {
  const ids = [...pickMix(BANK.filter(q => CMAP[q.c].s === 1), 10), ...pickMix(BANK.filter(q => CMAP[q.c].s === 2), 40)];
  INK.s = {};
  MK_S = { ids, i: 0, ans: {}, end: Date.now() + 90 * 60 * 1000 };
  go('mockrun');
  timerId = setInterval(() => { const el = $('#mt'); if (!MK_S) return; const left = MK_S.end - Date.now(); if (left <= 0) { submitMock(true); return; } if (el) el.textContent = fmtT(left); }, 1000);
}
const fmtT = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
function mockrun() {
  const id = MK_S.ids[MK_S.i], q = QMAP[id], answered = Object.keys(MK_S.ans).length;
  return `<div class="top" style="margin-top:4px"><button class="icon-btn" onclick="ask('모의고사를 그만둘까요? 이번 풀이는 저장되지 않아요.', '그만두기', ()=>{MK_S=null;go('home')})">✕</button>
    <span class="timer" id="mt">${fmtT(MK_S.end - Date.now())}</span><button class="icon-btn" onclick="mockGrid()">${answered}/50</button></div>
  <div class="sub" style="margin-top:10px">${MK_S.i < 10 ? '1과목' : '2과목'} · ${MK_S.i + 1}번</div>
  <div class="inkw inkall ${INK.on ? 'inking' : ''}${(INK.s[q.id] || []).length ? ' hasink' : ''}" id="inkw" data-q="${q.id}"><div class="qa"><div class="qa-l"><div class="top" style="justify-content:flex-end">${inkBar()}</div>
  ${tblBlock(q)}<div class="q">${md(q.q)}</div>${qExtra(q)}${figs(q)}${qCode(q)}</div><div class="qa-r">
  ${q.o.map((t, k) => `<button class="opt ${MK_S.ans[id] === k ? 'sel' : ''}" onclick="MK_S.ans[${id}]=${k};render()"><span class="n">${k + 1}</span><span>${ot(t)}</span></button>`).join('')}
  <div class="grid2" style="margin-top:12px"><button class="btn line" ${MK_S.i ? '' : 'disabled'} onclick="MK_S.i--;render();scrollTo(0,0)">이전</button>
  ${MK_S.i < 49 ? `<button class="btn" onclick="MK_S.i++;render();scrollTo(0,0)">다음</button>` : `<button class="btn" onclick="submitMock()">제출</button>`}</div>
  <button class="btn ghost" style="margin-top:10px" onclick="showTables()">EMP · DEPT 테이블 보기</button></div></div><canvas class="ink" id="ink"></canvas></div>`;
}
function mockGrid() {
  sheet(`<b>문항 이동</b><div style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px;margin:12px 0">${MK_S.ids.map((id, i) => `<button class="chip ${MK_S.ans[id] != null ? 'on' : ''}" style="margin:0;padding:8px 0" onclick="MK_S.i=${i};closeSheet();render()">${i + 1}</button>`).join('')}</div>
  <button class="btn" onclick="closeSheet();submitMock()">제출하고 채점</button>`);
}
function submitMock(auto, force) {
  if (!auto && !force && Object.keys(MK_S.ans).length < 50) return ask(`안 푼 문제가 ${50 - Object.keys(MK_S.ans).length}개 있어요. 제출할까요?`, '제출', () => submitMock(false, true));
  clearInterval(timerId); timerId = null;
  let s1 = 0, s2 = 0; const wrongs = [];
  MK_S.ids.forEach((id, i) => { const ok = MK_S.ans[id] === QMAP[id].a; if (MK_S.ans[id] != null) record(id, ok); else markWrong(S.att[id] || (S.att[id] = { n: 0, c: 0, st: 0, w: false, wr: 0 })); if (ok) { if (i < 10) s1 += 2; else s2 += 2; } else wrongs.push(id); });
  const total = s1 + s2, pass = total >= 60 && s1 >= 8 && s2 >= 32;
  const r = { date: today(), s1, s2, total, pass, wrongs, ids: MK_S.ids, ans: MK_S.ans };
  S.mocks.push({ date: r.date, s1, s2, total, pass, ids: MK_S.ids, ans: MK_S.ans }); save();
  MK_S = null; go('mockresult', r);
}
let MR = null;
function mockresult() {
  const r = MR = P, ids = r.ids || [], ans = r.ans || {};
  const isOk = id => ans[id] === QMAP[id].a;
  const wrongs = ids.length ? ids.filter(id => !isOk(id)) : (r.wrongs || []), blank = ids.filter(id => ans[id] == null).length;
  const byC = {}; ids.forEach(id => { const q = QMAP[id], x = byC[q.c] = byC[q.c] || { n: 0, ok: 0, w: [] }; x.n++; if (isOk(id)) x.ok++; else x.w.push(id); });
  const weakC = Object.entries(byC).filter(([, x]) => x.w.length).sort((p, q) => q[1].w.length - p[1].w.length || p[1].ok / p[1].n - q[1].ok / q[1].n);
  const allOkC = Object.values(byC).filter(x => !x.w.length).length;
  const byD = [1, 2, 3, 4].map(d => { const l = ids.filter(id => QMAP[id].d === d); return { d, n: l.length, ok: l.filter(isOk).length }; }).filter(x => x.n);
  const subj = k => { const l = ids.filter(id => CMAP[QMAP[id].c].s === k); return { n: l.length, ok: l.filter(isOk).length }; };
  const s1 = subj(1), s2 = subj(2);
  const top = weakC[0];
  const tip = !ids.length ? '' : r.pass
    ? (weakC.length ? `합격선은 넘었어요. 아래 개념에서 틀리거나 못 푼 ${wrongs.length}문제가 있으니 많이 틀린 개념부터 메우면 점수가 더 안정돼요.` : '전부 맞혔어요.')
    : (r.s1 < 8 ? `1과목이 과락이에요(${s1.ok}/${s1.n}). 1과목은 10문제뿐이라 개념 몇 개만 잡아도 바로 올라가요. ` : '') + (top ? `가장 많이 틀린 건 ${CMAP[top[0]].name}(${top[1].w.length}문제)이에요.` : '');
  const bar = (ok, n) => `<div class="bar ${lvl(n ? ok / n : null)}" style="margin-top:6px"><i style="width:${n ? ok / n * 100 : 0}%"></i></div>`;
  return `${r.past ? `<button class="icon-btn" onclick="go('stats')">← 분석</button>` : ''}<h1>모의고사 결과</h1>
  <div class="card" style="text-align:center"><div class="sub">${r.date}</div><div class="big">${r.total}점</div>
  <div style="margin-top:6px"><span class="pill">${r.pass ? '합격' : '불합격'}</span></div>
  <div class="grid2" style="margin-top:14px"><div class="stat"><b>${r.s1} / 20</b><span>1과목 ${r.s1 < 8 ? '· 과락' : ''}</span></div><div class="stat"><b>${r.s2} / 80</b><span>2과목 ${r.s2 < 32 ? '· 과락' : ''}</span></div></div>
  ${ids.length ? `<div class="sub" style="margin-top:10px">맞힘 ${ids.length - wrongs.length} · 틀림 ${wrongs.length - blank}${blank ? ` · 안 푼 문제 ${blank}` : ''}</div>` : ''}</div>
  ${tip ? `<div class="card mrtip">${esc(tip)}</div>` : ''}
  ${byD.length ? `<div class="card"><b>난이도별</b>${byD.map(x => `<div style="margin-top:10px"><div class="top"><span>${DLABEL[x.d]}</span><span class="sub">${x.ok}/${x.n} 맞힘</span></div>${bar(x.ok, x.n)}</div>`).join('')}</div>` : ''}
  ${weakC.length ? `<h2>개념별로 보기 <span class="sub" style="font-size:13px;font-weight:400">틀린 개념 ${weakC.length}개 · 다 맞힌 개념 ${allOkC}개</span></h2>
  <div class="cgrid">${weakC.map(([cid, x]) => { const c = CMAP[cid], cs = conceptStat(cid); return `<div class="card mrc">
    <div class="top"><div><span class="tag">${c.s}과목</span><b>${esc(c.name)}</b></div><span class="sub" style="white-space:nowrap;text-align:right">${x.ok}/${x.n} 맞힘${cs.acc != null ? `<br>누적 ${pct(cs.acc)}` : ''}</span></div>
    ${bar(x.ok, x.n)}
    <div class="rounds" style="margin-top:10px"><button class="chip c mr-w" onclick="mrWrong('${cid}')">틀린 ${x.w.length}문제 다시</button><button class="chip mr-d" onclick="mrDrill('${cid}')">10문항 더</button><button class="chip" onclick="go('concept',{id:'${cid}'})">개념 보기</button></div></div>`; }).join('')}</div>`
  : ''}
  ${wrongs.length ? `<button class="btn" onclick="mrWrong()">틀린 ${wrongs.length}문제 해설 보며 다시 풀기</button>` : ''}
  <button class="btn line" style="margin-top:10px" onclick="go('home')">홈으로</button>`;
}
function mrWrongIds(cid) { const r = MR, ans = r.ans || {}; const l = (r.ids || []).filter(id => ans[id] !== QMAP[id].a); return (r.ids ? l : (r.wrongs || [])).filter(id => !cid || QMAP[id].c === cid); }
function mrWrong(cid) { const ids = mrWrongIds(cid); if (!ids.length) return; INK.s = {}; QS = { ids, i: 0, mode: 'wrong', res: {}, pick: null, shown: false, title: '모의고사 오답' + (cid ? ' · ' + CMAP[cid].name : '') }; go('quiz'); }
function mrDrill(cid) { startPractice({ cs: [cid], n: 10, order: 'new', title: CMAP[cid].name + ' 10문항' }); }
// 지난 모의고사들에서 자주 틀린 개념
function mockWeak() {
  const cnt = {}; S.mocks.forEach(m => (m.ids || []).forEach(id => { if (m.ans[id] !== QMAP[id].a) cnt[QMAP[id].c] = (cnt[QMAP[id].c] || 0) + 1; }));
  return Object.entries(cnt).sort((p, q) => q[1] - p[1]).slice(0, 5);
}

// ───────── 플래시카드 ─────────
let FC = null;
function flash() {
  if (!FC) return `<button class="icon-btn" onclick="go('home')">← 홈</button><h1>플래시카드</h1><div class="sub">키워드를 보고 뜻을 떠올린 뒤 카드를 눌러 확인</div>
    <div class="cgrid">${FLASH.map((s, i) => { const known = s.cards.filter((c, j) => S.fl[i + '-' + j]).length; return `<div class="card" onclick="startFlash(${i})"><div class="top"><b>${esc(s.name)}</b><span class="sub">${known}/${s.cards.length} 외움</span></div><div class="bar high" style="margin-top:8px"><i style="width:${known / s.cards.length * 100}%"></i></div></div>`; }).join('')}</div>
    <button class="btn line" onclick="startFlash(-1)">모르는 카드만 전체 섞어서</button>`;
  const [si, ci] = FC.list[FC.i], card = FLASH[si].cards[ci];
  return `<div class="top"><button class="icon-btn" onclick="FC=null;render()">✕</button><span class="sub">${FC.i + 1} / ${FC.list.length}</span><span></span></div>
  <div class="card flash" onclick="FC.flip=!FC.flip;render()">${FC.flip ? `<small style="margin:0 0 10px">${md(card[0])}</small><b>${md(card[1])}</b><small>${md(card[2])}</small>` : `<span>${md(card[0])}</span><small>${esc(FLASH[si].name)} · 눌러서 뒤집기</small>`}</div>
  <div class="grid2"><button class="btn line" onclick="flAns(0)">모르겠어요</button><button class="btn" onclick="flAns(1)">알아요</button></div>`;
}
function startFlash(si) {
  let list = [];
  FLASH.forEach((s, i) => s.cards.forEach((c, j) => { if (si === -1 ? !S.fl[i + '-' + j] : i === si) list.push([i, j]); }));
  if (!list.length) return toast('모르는 카드가 없어요');
  FC = { list: shuffle(list), i: 0, flip: false }; render();
}
function flAns(k) { const [si, ci] = FC.list[FC.i]; if (k) S.fl[si + '-' + ci] = 1; else delete S.fl[si + '-' + ci]; save(); if (FC.i + 1 < FC.list.length) { FC.i++; FC.flip = false; render(); } else { FC = null; toast('세트 끝'); render(); } }

// ───────── 설정 · 백업 ─────────
function settings() {
  return `<button class="icon-btn" onclick="go('home')">← 홈</button><h1>설정</h1>
  <div class="card"><b>시험일</b><input type="date" value="${S.set.exam}" onchange="S.set.exam=this.value;save()">
  <b style="display:block;margin-top:12px">하루 목표 문항 수</b><input type="number" min="5" max="200" value="${S.set.goal}" onchange="S.set.goal=Math.max(5,+this.value||30);save()"></div>
  <div class="card"><b>백업</b><div class="sub" style="margin:4px 0 10px">앱을 다시 설치하기 전에 백업 코드를 복사해 메모 앱 등에 붙여 두세요. 보통은 같은 앱 위에 덮어 설치하면 기록이 유지돼요.</div>
  <button class="btn ghost" onclick="exportData()">백업 코드 만들기</button>
  <textarea id="bk" rows="4" style="margin-top:10px" placeholder="백업 코드를 여기에 붙여넣고 복원"></textarea>
  <button class="btn line" style="margin-top:8px" onclick="importData()">붙여넣은 코드로 복원</button></div>
  <div class="card"><b>초기화</b><button class="btn line" style="margin-top:8px;color:var(--bad)" onclick="ask('모든 풀이 기록을 지울까요? 되돌릴 수 없어요.', '지우기', ()=>{S=blank();save();toast('초기화했어요');render()})">모든 기록 지우기</button></div>
  <div class="sub" style="text-align:center">문제 ${BANK.length}개 · 개념 ${CONCEPTS.length}개 · 플래시카드 ${FLASH.reduce((a, s) => a + s.cards.length, 0)}장</div>`;
}
function exportData() {
  const t = $('#bk'); t.value = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  if (NATIVE && NATIVE.share) { NATIVE.share.postMessage('SQLD 합격노트 백업 ' + today() + '\n' + t.value); return; }
  t.select();
  const fallback = () => { try { document.execCommand('copy'); toast('복사했어요'); } catch (e) { toast('코드를 길게 눌러 복사하세요'); } };
  try { navigator.clipboard.writeText(t.value).then(() => toast('복사했어요'), fallback); } catch (e) { fallback(); }
}
function importData() {
  try { const raw = $('#bk').value.trim().split('\n').pop().trim(); const d = JSON.parse(decodeURIComponent(escape(atob(raw)))); if (!d.att) throw 0; S = Object.assign(blank(), d); save(); toast('복원했어요'); go('home'); }
  catch (e) { toast('코드가 올바르지 않아요'); }
}

render();
// claude.ai 아티팩트에서는 기록을 계정에 저장 (다른 기기에서도 이어 풀기)
(async () => {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (!db || !user) return;
    const uid = await user.id(); if (!uid) return;
    const ref = db.doc('data/users/' + uid + '/state');
    const snap = await ref.get();
    if (snap.exists) {
      const d = snap.data();
      if (d && d.json && (d.at || 0) > (S.at || 0)) { S = Object.assign(blank(), JSON.parse(d.json)); S.set = Object.assign(blank().set, S.set); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} if (view !== 'quiz' && view !== 'mockrun') render(); }
    }
    CLOUD = ref;
    if (!snap.exists || ((snap.data() || {}).at || 0) < (S.at || 0)) ref.set({ json: JSON.stringify(S), at: S.at || Date.now() }).catch(() => {});
  } catch (e) {}
})();
