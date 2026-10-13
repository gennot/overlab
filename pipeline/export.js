// Trasforma store/ nei file letti dall'app (stesso formato della versione di prova):
// site/data.json (prossime partite, stemmi) e site/c-<competizione>.json (storico e giocatori).
'use strict';
const fs = require('fs'), path = require('path');
global.Model = require('../app/model.js');
const Core = require('../app/core.js');
const LEAGUES = require('./leagues');
const ROOT = path.join(__dirname, '..'), STORE = path.join(ROOT, 'store'), OUT = path.join(ROOT, 'site');
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(STORE, f), 'utf8')); } catch (e) { return d; } };
const DAY = 864e5, now = Date.now(), Y = new Date(now).getUTCFullYear();
const DONE = { FT: 1, AET: 1, PEN: 1 }, LIVE = { '1H': 1, HT: 1, '2H': 1, ET: 1, BT: 1, P: 1, LIVE: 1, INT: 1 }, GONE = { PST: 1, CANC: 1, ABD: 1, AWD: 1, WO: 1, SUSP: 1 };

const teamsRaw = readJ('teams.json', {}), state = readJ('state.json', {});
const T = {}; Object.keys(teamsRaw).forEach(id => { const n = Core.itName(teamsRaw[id].n); T[id] = { n: n, s: n, l: '' }; });
// stemmi serviti dal sito stesso (scaricati da collect.js): il browser non contatta altri server
const logos = {}; fs.mkdirSync(path.join(OUT, 'logos'), { recursive: true });
Object.keys(teamsRaw).forEach(id => { const f = path.join(STORE, 'logos', id + '.png'); if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(OUT, 'logos', id + '.png')); logos[id] = 'logos/' + id + '.png'; } });

// partita nel formato dell'app
function toApp(m) {
  const o = { id: m.id, d: m.d, lg: m.lg, h: m.h, a: m.a, st: DONE[m.s] ? 'post' : LIVE[m.s] ? 'in' : 'pre', done: !!DONE[m.s], nm: m.s };
  if (o.done) { o.sc = m.sc || null; if (m.H && m.A) { o.H = m.H; o.A = m.A; } else { o.H = o.A = null; } }
  return o;
}
const fxBy = {}; LEAGUES.forEach(l => { fxBy[l.lg] = Object.values(readJ('fx/' + l.lg + '.json', {})).filter(m => !GONE[m.s]).sort((a, b) => a.d - b.d); });
const mem = {};
const tmOf = list => { const tm = {}; list.forEach(m => { tm[m.h] = T[m.h] || { n: m.h, s: m.h, l: '' }; tm[m.a] = T[m.a] || { n: m.a, s: m.a, l: '' }; }); return tm; };
// tabelloni per anno solare
LEAGUES.forEach(l => [Y - 1, Y].forEach(y => {
  const list = fxBy[l.lg].filter(m => new Date(m.d).getUTCFullYear() === y).map(toApp);
  if (list.length) mem['sb:' + l.lg + ':' + y] = { t: now, m: list, tm: tmOf(list) };
}));
// prossime partite per competizione (le chiavi mensili lette all'avvio)
const months = [0, 1, 2].map(k => { const d = new Date(Date.UTC(Y, new Date(now).getUTCMonth() + k, 1)); return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0'); });
const sumIds = {}, upSoon = [], cupSum = {};
Core.COMPS.forEach(c => {
  const up = (fxBy[c.id] || []).filter(m => !DONE[m.s] && m.d > now - 3 * 36e5 && m.d < now + 45 * DAY).map(toApp);
  months.forEach(k => { mem['sb:' + c.id + ':' + k] = { t: now, m: up, tm: tmOf(up) }; });
  // per le partite dei prossimi 9 giorni: dati dei giocatori delle ultime 12 di ogni squadra (tutto il gruppo della competizione)
  // coppe: le ultime partite di ogni squadra contano anche quelle di campionato
  const played = [].concat(...c.pool.concat(c.xpool || []).map(lg => fxBy[lg] || [])).filter(m => DONE[m.s] && m.det === 1).sort((a, b) => a.d - b.d);
  const mine = c.cup ? (cupSum[c.id] = {}) : null;
  up.filter(m => m.d < now + 9 * DAY).forEach(m => {
    upSoon.push(m.id); if (mine) mine[m.id] = 1;
    [m.h, m.a].forEach(t => { let n = 0; for (let i = played.length - 1; i >= 0 && n < 12; i--) { const p = played[i]; if (p.h === t || p.a === t) { sumIds[p.id] = p; if (mine) mine[p.id] = 1; n++; } } });
  });
});
Object.values(sumIds).forEach(p => {
  if (!p.P || !p.P.length) return;
  const Tm = {}; if (p.H) Tm[p.h] = { sh: p.H.sh, sot: p.H.sot, fo: p.H.fo }; if (p.A) Tm[p.a] = { sh: p.A.sh, sot: p.A.sot, fo: p.A.fo };
  mem['sm:' + p.id] = { id: p.id, d: p.d, T: Tm, P: p.P, off: true };
});
// formazioni ufficiali delle prossime partite
const allFx = {}; Object.values(fxBy).forEach(L => L.forEach(m => { allFx[m.id] = m; }));
upSoon.forEach(id => {
  const m = allFx[id]; if (!m || !m.lu) return;
  const P = []; m.lu.forEach(t => { t.x.forEach(p => P.push([t.t, p[0], p[1], 'GDMF'.indexOf(p[2]) >= 0 ? p[2] : '', 1, 0, 0, 0, 0, 0, 0, p[3]])); t.b.forEach(p => P.push([t.t, p[0], p[1], 'GDMF'.indexOf(p[2]) >= 0 ? p[2] : '', 0, 0, 0, 0, 0, 0, 0, p[3]])); });
  if (P.length) mem['sm:' + id] = { id: id, d: m.d, T: {}, P: P, off: true };
});
// divisione in file: base (prossime partite) + uno per competizione
const pools = {}; Core.COMPS.forEach(c => { if (!c.cup) pools[c.id] = c.pool; });
const CUPS = Core.COMPS.filter(c => c.cup), CUPL = CUPS.length ? CUPS[0].pool : [], DOML = CUPS.length ? CUPS[0].xpool : [];
const lg2c = {}; Object.keys(pools).forEach(c => pools[c].forEach(lg => { lg2c[lg] = c; }));
const base = {}, comp = {}, id2c = {};
Object.keys(mem).forEach(k => {
  if (!k.startsWith('sb:')) return; const [, lg, when] = k.split(':');
  if (when.length === 6) { base[k] = mem[k]; return; }
  const c = lg2c[lg]; if (!c) return; (comp[c] = comp[c] || {})[k] = mem[k]; mem[k].m.forEach(m => { id2c[m.id] = c; });
});
Object.keys(mem).forEach(k => { if (!k.startsWith('sm:')) return; const c = id2c[k.slice(3)]; if (c) (comp[c] = comp[c] || {})[k] = mem[k]; });
// coppe europee: un file comune (coppe complete + campionati in forma compatta) e uno per coppa con i giocatori
if (CUPS.length) {
  const shared = {}, ok = m => m.done && m.H && m.A && m.sc && m.H.fo + m.A.fo >= 6 && m.H.sh + m.A.sh >= 5 && m.H.sot <= m.H.sh && m.A.sot <= m.A.sh;
  Object.keys(mem).forEach(k => {
    if (!k.startsWith('sb:')) return; const [, lg, when] = k.split(':'); if (when.length !== 4) return;
    if (CUPL.indexOf(lg) >= 0) shared[k] = mem[k];
    else if (DOML.indexOf(lg) >= 0) { const v = mem[k]; shared['sx:' + lg + ':' + when] = { t: v.t, tm: v.tm, r: v.m.filter(ok).map(m => [m.id, Math.round(m.d / 6e4), m.h, m.a, m.sc[0], m.sc[1], m.H.sh, m.H.sot, m.H.co, m.H.fo, m.H.yc, m.A.sh, m.A.sot, m.A.co, m.A.fo, m.A.yc]) }; }
  });
  comp.coppe = shared;
  CUPS.forEach(c => { const o = comp[c.id] = {}; Object.keys(cupSum[c.id] || {}).forEach(id => { if (mem['sm:' + id]) o['sm:' + id] = mem['sm:' + id]; }); });
}
fs.mkdirSync(OUT, { recursive: true });
fs.readdirSync(OUT).filter(f => /^c-.*\.json$/.test(f)).forEach(f => fs.unlinkSync(path.join(OUT, f)));
fs.writeFileSync(path.join(OUT, 'data.json'), JSON.stringify({ t: state.t || now, mem: base, logos: logos }));
let tot = 0; Object.keys(comp).forEach(c => { const s = JSON.stringify({ mem: comp[c] }); fs.writeFileSync(path.join(OUT, 'c-' + c + '.json'), s); tot += s.length; });
const nUp = Object.values(base).reduce((s, b) => s + b.m.length, 0) / 3;
console.log('esportato: ' + Object.keys(comp).length + ' competizioni, ' + Math.round(tot / 1e6 * 10) / 10 + ' MB di storico, ' + Math.round(nUp) + ' prossime partite');
