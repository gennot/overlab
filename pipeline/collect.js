// Scarica da API-Football le partite dei campionati dell'app e le salva in store/.
// Gira su GitHub ogni poche ore. Rispetta il limite giornaliero del piano (gratis: 100 richieste al giorno,
// 10 al minuto): si ferma quando ne restano RESERVE.
// Variabili: APISPORTS_KEY (segreto), API_BASE (per le prove), MAX_CALLS (tetto per singolo giro).
'use strict';
const fs = require('fs'), path = require('path');
const LEAGUES = require('./leagues');
const KEY = process.env.APISPORTS_KEY || '';
const BASE = process.env.API_BASE || 'https://v3.football.api-sports.io';
let MAX_CALLS = +process.env.MAX_CALLS || 60;
const RESERVE = +process.env.RESERVE || 4;
let GAP = process.env.API_BASE ? 0 : 6500;              // 10 richieste al minuto sul piano gratis; col piano a pagamento si accelera da solo
const ROOT = path.join(__dirname, '..', 'store');
const DAY = 864e5;
const BYID = {}; LEAGUES.forEach(l => { BYID[l.id] = l; });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return d; } };
const writeJ = (f, v) => { const p = path.join(ROOT, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); };

const state = readJ('state.json', { seasons: {}, calFull: '', blocked: {}, log: [] });
const teams = readJ('teams.json', {});
const fx = {};                                          // lg -> { id -> partita }
LEAGUES.forEach(l => { fx[l.lg] = readJ('fx/' + l.lg + '.json', {}); });

let calls = 0, remaining = null, stop = '', paid = false;
function note(s) { console.log(s); state.log = (state.log || []).concat(new Date().toISOString().slice(0, 16) + ' ' + s).slice(-60); }

async function api(q) {
  if (stop) return null;
  if (calls >= MAX_CALLS) { stop = 'tetto del giro raggiunto'; return null; }
  if (remaining != null && remaining <= RESERVE) { stop = 'quota del giorno quasi finita'; return null; }
  if (calls) await sleep(GAP);
  calls++;
  let r, j;
  try { r = await fetch(BASE + q, { headers: { 'x-apisports-key': KEY } }); j = await r.json(); }
  catch (e) { note('errore di rete su ' + q + ': ' + e.message); return null; }
  const rem = r.headers.get('x-ratelimit-requests-remaining'); if (rem != null && rem !== '') remaining = +rem;
  // piano a pagamento (es. Pro: 7.500 al giorno): più richieste per giro e meno attesa, restando sotto il limite giornaliero (8 giri al giorno)
  const lim = +(r.headers.get('x-ratelimit-requests-limit') || 0);
  if (lim >= 1000) paid = true;
  if (lim >= 1000 && !process.env.API_BASE && GAP > 300) { GAP = 300; MAX_CALLS = Math.max(MAX_CALLS, Math.floor(lim / 8) - 40); note('piano con ' + lim + ' richieste al giorno: fino a ' + MAX_CALLS + ' per giro'); }
  const err = j && j.errors && (Array.isArray(j.errors) ? j.errors.length : Object.keys(j.errors).length) ? j.errors : null;
  if (err) {
    const t = JSON.stringify(err); note('API: ' + q + ' -> ' + t);
    if (/token|key|access|subscription|suspended/i.test(t) && !/season|plan/i.test(t)) stop = 'chiave non valida';
    if (/limit|requests/i.test(t)) stop = 'limite richieste';
    return { err: t };
  }
  return { res: j.response || [] };
}

// stagione corrente per tipo di campionato
function seasonsOf(l, now) {
  const d = new Date(now), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (l.type === 'eu') { const s = m >= 7 ? y : y - 1; return [s - 1, s]; }
  return [y - 1, y];
}
const DONE = { FT: 1, AET: 1, PEN: 1 }, LIVE = { '1H': 1, HT: 1, '2H': 1, ET: 1, BT: 1, P: 1, LIVE: 1, INT: 1 }, GONE = { PST: 1, CANC: 1, ABD: 1, AWD: 1, WO: 1, SUSP: 1 };

function keepTeam(t) { if (!t || t.id == null) return; const id = String(t.id); teams[id] = { n: t.name, l: t.logo || '' }; }
// partita base (calendario/risultato) senza dettagli
function base(f) {
  const lgDef = BYID[f.league && f.league.id]; if (!lgDef) return null;
  const s = (f.fixture.status && f.fixture.status.short) || 'NS';
  keepTeam(f.teams.home); keepTeam(f.teams.away);
  const old = fx[lgDef.lg][String(f.fixture.id)] || {};
  const m = Object.assign(old, {
    id: String(f.fixture.id), lg: lgDef.lg, d: (f.fixture.timestamp || 0) * 1000 || Date.parse(f.fixture.date),
    h: String(f.teams.home.id), a: String(f.teams.away.id), s: s,
    sc: f.goals && f.goals.home != null ? [f.goals.home, f.goals.away] : old.sc || null
  });
  fx[lgDef.lg][m.id] = m;
  return m;
}
const statOf = (arr, type) => { const x = (arr || []).find(s => s.type === type); if (!x || x.value == null || x.value === '') return null; const v = parseFloat(String(x.value)); return isFinite(v) ? v : null; };
// dettagli: statistiche di squadra, giocatori, formazioni
function detail(f) {
  const m = base(f); if (!m) return;
  if (DONE[m.s]) {
    const st = {}; (f.statistics || []).forEach(t => { st[String(t.team.id)] = t.statistics; });
    const one = id => { const a = st[id]; if (!a) return null; const sh = statOf(a, 'Total Shots'), sot = statOf(a, 'Shots on Goal'), co = statOf(a, 'Corner Kicks'), fo = statOf(a, 'Fouls'), yc = statOf(a, 'Yellow Cards');
      if (sh == null && sot == null && fo == null) return null; return { sh: sh || 0, sot: sot || 0, co: co || 0, fo: fo || 0, yc: yc || 0 }; };
    m.H = one(m.h); m.A = one(m.a);
    const P = [];
    (f.players || []).forEach(t => (t.players || []).forEach(p => {
      const s = (p.statistics && p.statistics[0]) || {}, g = s.games || {}, sh = s.shots || {}, fo = s.fouls || {}, ca = s.cards || {};
      const min = g.minutes || 0; if (!min) return;
      const pos = (g.position || '').charAt(0).toUpperCase();
      P.push([String(t.team.id), String(p.player.id), p.player.name || '?', 'GDMF'.indexOf(pos) >= 0 ? pos : '', g.substitute ? 0 : 1, min, sh.total || 0, sh.on || 0, fo.committed || 0, fo.drawn || 0, ca.yellow || 0, g.number != null ? String(g.number) : '']);
    }));
    m.P = P; m.det = 1;
  }
  if (f.lineups && f.lineups.length) {
    m.lu = f.lineups.map(t => ({ t: String(t.team.id), x: (t.startXI || []).map(p => [String(p.player.id), p.player.name, (p.player.pos || '').charAt(0), p.player.number != null ? String(p.player.number) : '']),
      b: (t.substitutes || []).map(p => [String(p.player.id), p.player.name, (p.player.pos || '').charAt(0), p.player.number != null ? String(p.player.number) : '']) }));
  }
}
const ymd = t => new Date(t).toISOString().slice(0, 10);
const allFx = () => [].concat(...Object.values(fx).map(o => Object.values(o)));

async function byIds(ids) {
  for (let i = 0; i < ids.length && !stop; i += 20) {
    const part = ids.slice(i, i + 20), r = await api('/fixtures?ids=' + part.join('-'));
    if (!r || r.err) { if (r && r.err) part.forEach(id => { const m = allFx().find(x => x.id === id); if (m) m.det = -1; }); continue; }
    r.res.forEach(detail);
  }
}

(async function main() {
  if (!KEY && !process.env.API_BASE) { console.log('Manca la chiave APISPORTS_KEY: niente da scaricare.'); return; }
  const now = Date.now(), today = ymd(now);
  // 1) calendario: una volta al giorno i prossimi 7 giorni, a ogni giro ieri/oggi/domani
  const full = state.calFull !== today, days = full ? [-1, 0, 1, 2, 3, 4, 5, 6, 7] : [-1, 0, 1];
  for (const k of days) { const r = await api('/fixtures?date=' + ymd(now + k * DAY) + '&timezone=Europe/Rome'); if (r && r.res) r.res.forEach(base); }
  if (full && !stop) state.calFull = today;
  // 2) dettagli delle partite finite che non li hanno ancora (prima le più recenti, prima i campionati principali)
  const ord = {}; LEAGUES.forEach((l, i) => { ord[l.lg] = i; });
  const need = () => allFx().filter(m => DONE[m.s] && !m.det && m.d > now - 2 * 366 * DAY).sort((a, b) => (b.d > now - 10 * DAY) - (a.d > now - 10 * DAY) || ord[a.lg] - ord[b.lg] || b.d - a.d);
  // 3) formazioni ufficiali delle partite che iniziano a breve
  const soon = allFx().filter(m => !DONE[m.s] && !GONE[m.s] && m.d > now - 15 * 6e4 && m.d < now + 80 * 6e4 && !m.lu).map(m => m.id);
  if (soon.length) await byIds(soon);
  await byIds(need().filter(m => m.d > now - 10 * DAY).map(m => m.id));
  // 4) storico: elenco partite per stagione, poi i dettagli un po' alla volta
  for (const l of LEAGUES) {
    if (stop) break;
    for (const s of seasonsOf(l, now)) {
      const k = l.lg + ':' + s, b = state.blocked[k]; if (state.seasons[k] || (b && b.d === ymd(now) && !paid)) continue;   // se il piano non la copriva si riprova il giorno dopo
      const r = await api('/fixtures?league=' + l.id + '&season=' + s); if (!r) break;
      if (r.err) { if (/season|plan/i.test(r.err)) { state.blocked[k] = { d: ymd(now), e: r.err.slice(0, 200) }; note('stagione non disponibile col piano attuale: ' + k); } continue; }
      r.res.forEach(base); state.seasons[k] = ymd(now); delete state.blocked[k];
    }
  }
  if (!stop) await byIds(need().map(m => m.id));
  // salvataggio: i dati dei giocatori servono solo per le ultime partite di ogni squadra, i più vecchi si tolgono
  LEAGUES.forEach(l => {
    if (l.type === 'int') return;
    const keep = {}, byTeam = {};
    Object.values(fx[l.lg]).filter(m => m.det === 1).sort((a, b) => b.d - a.d).forEach(m => [m.h, m.a].forEach(t => { byTeam[t] = (byTeam[t] || 0) + 1; if (byTeam[t] <= 16) keep[m.id] = 1; }));
    Object.values(fx[l.lg]).forEach(m => { if (m.P && !keep[m.id]) delete m.P; });
  });
  LEAGUES.forEach(l => writeJ('fx/' + l.lg + '.json', fx[l.lg]));
  writeJ('teams.json', teams);
  // stemmi: una copia sul sito, così chi apre OverLab non si collega ad altri server (le immagini non contano nel limite di richieste)
  const LOGOS = path.join(ROOT, 'logos'); fs.mkdirSync(LOGOS, { recursive: true }); let nl = 0;
  for (const id of Object.keys(teams)) {
    if (nl >= 400) break; const f = path.join(LOGOS, id + '.png'); if (fs.existsSync(f) || !teams[id].l || process.env.API_BASE) continue;
    try { const r = await fetch(teams[id].l); if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); nl++; } } catch (e) { }
  }
  if (nl) note('stemmi scaricati: ' + nl);
  const left = need().length;
  note('giro finito: ' + calls + ' richieste' + (remaining != null ? ', ne restano oggi ' + remaining : '') + (stop ? ' (stop: ' + stop + ')' : '') + ', partite senza dettagli ancora: ' + left);
  state.pending = left; state.t = now;
  writeJ('state.json', state);
})().catch(e => { console.error(e); process.exit(1); });
